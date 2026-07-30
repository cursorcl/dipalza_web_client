import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import * as L from 'leaflet';

import { MapaComponent } from './mapa.component';
import { environment } from 'environments/environment';
import { colorForVendedor } from './vendor-color';

describe('MapaComponent', () => {
  let component: MapaComponent;
  let fixture: ComponentFixture<MapaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MapaComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MapaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('centrarEnVendedor no lanza error si el vendedorId no tiene marcador', () => {
    expect(() => component.centrarEnVendedor('no-existe')).not.toThrow();
  });

  it('un vendedor del padrón sin posición reportada aparece en la lista como "Sin datos" y offline', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    // La carga inicial de posiciones (GET /posicion) ya se dispara en ngAfterViewInit
    // dentro del beforeEach; la respondemos vacía para este caso.
    httpMock.expectOne(`${environment.apiUrl}/posicion`).flush([]);

    const reqVendedores = httpMock.expectOne(`${environment.apiUrl}/vendedores`);
    reqVendedores.flush([{ codigo: '001', tipo: '0', nombre: 'Juan Perez' }]);

    const lista = component.vendedores();
    expect(lista).toHaveSize(1);
    expect(lista[0].vendedorNombre).toBe('Juan Perez');
    expect(lista[0].tiempoRelativo).toBe('Sin datos');
    expect(lista[0].online).toBeFalse();
  });

  it('un vendedor del padrón con posición reportada aparece en la lista como online con color y tiempo relativo', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    const posicion = {
      vendedorId: '001',
      vendedorCodigo: '0',
      vendedorNombre: 'Juan Perez',
      fechaHora: new Date().toISOString(),
      latitud: -33.4,
      longitud: -70.6
    };

    httpMock.expectOne(`${environment.apiUrl}/posicion`).flush([posicion]);

    const reqVendedores = httpMock.expectOne(`${environment.apiUrl}/vendedores`);
    reqVendedores.flush([{ codigo: '001', tipo: '0', nombre: 'Juan Perez' }]);

    const lista = component.vendedores();
    expect(lista).toHaveSize(1);
    expect(lista[0].vendedorNombre).toBe('Juan Perez');
    expect(lista[0].online).toBeTrue();
    expect(lista[0].tiempoRelativo).not.toBe('Sin datos');
    expect(lista[0].color).toBeTruthy();
    expect(lista[0].color).toBe(colorForVendedor('001_0'));
  });

  it('solo muestra en la lista a los vendedores con tipo "0", descartando otros tipos del mismo padrón', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${environment.apiUrl}/posicion`).flush([]);

    const reqVendedores = httpMock.expectOne(`${environment.apiUrl}/vendedores`);
    reqVendedores.flush([
      { codigo: '001', tipo: '1', nombre: 'Cobrador Unico' },
      { codigo: '002', tipo: '0', nombre: 'Cristian Pavez' },
      { codigo: '002', tipo: '1', nombre: 'Cristian Pavez' }
    ]);

    const lista = component.vendedores();
    expect(lista).toHaveSize(1);
    expect(lista[0].vendedorNombre).toBe('Cristian Pavez');
  });

  it('si GET /vendedores falla, el componente no lanza error y la lista queda vacía', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${environment.apiUrl}/posicion`).flush([]);

    const reqVendedores = httpMock.expectOne(`${environment.apiUrl}/vendedores`);
    expect(() => {
      reqVendedores.flush(null, { status: 500, statusText: 'Server Error' });
    }).not.toThrow();

    expect(component.vendedores()).toEqual([]);
  });

  it('no muestra el toast cuando toastMensaje es null', () => {
    fixture.detectChanges();
    const toast = fixture.nativeElement.querySelector('.mapa-toast');
    expect(toast).toBeNull();
  });

  it('muestra el mensaje en pantalla cuando toastMensaje tiene un valor', () => {
    component.toastMensaje.set('Sin recorrido registrado hoy para Juan Perez');
    fixture.detectChanges();

    const toast = fixture.nativeElement.querySelector('.mapa-toast');
    expect(toast.textContent).toContain('Sin recorrido registrado hoy para Juan Perez');
  });

  it('toggleTrayectoria dibuja el recorrido del día y lo agrega a seleccionados', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });

    const req = httpMock.expectOne(`${environment.apiUrl}/posicion/historico`);
    expect(req.request.method).toBe('POST');
    req.flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 },
      { id: 2, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:05:00', latitud: -33.41, longitud: -70.61 }
    ]);

    expect(component.seleccionados().has('001_0')).toBeTrue();
  });

  it('toggleTrayectoria envía la fecha "dia" calculada en huso horario local (no UTC)', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });

    const req = httpMock.expectOne(`${environment.apiUrl}/posicion/historico`);
    expect(req.request.body.dia).toBe(new Date().toLocaleDateString('en-CA'));
    req.flush([]);
  });

  it('toggleTrayectoria oculta el recorrido si ya estaba visible', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 },
      { id: 2, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:05:00', latitud: -33.41, longitud: -70.61 }
    ]);
    expect(component.seleccionados().has('001_0')).toBeTrue();

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });

    expect(component.seleccionados().has('001_0')).toBeFalse();
    httpMock.expectNone(`${environment.apiUrl}/posicion/historico`);
  });

  it('toggleTrayectoria muestra un toast si no hay recorrido para hoy', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '002', tipo: '0', nombre: 'Ana Soto' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([]);

    expect(component.toastMensaje()).toBe('Sin recorrido registrado hoy para Ana Soto');
    expect(component.seleccionados().has('002_0')).toBeFalse();
  });

  it('el toast se oculta automáticamente después de 3 segundos', () => {
    jasmine.clock().install();
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '002', tipo: '0', nombre: 'Ana Soto' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([]);
    expect(component.toastMensaje()).not.toBeNull();

    jasmine.clock().tick(3000);
    expect(component.toastMensaje()).toBeNull();

    jasmine.clock().uninstall();
  });

  it('al seleccionar dos vendedores, la vista se ajusta para mostrar ambos recorridos', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 }
    ]);

    component.toggleTrayectoria({ codigo: '002', tipo: '0', nombre: 'Ana Soto' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 2, vendedorId: '002', vendedorCodigo: '0', vendedorNombre: 'Ana Soto', fechaHora: '2026-07-26T09:00:00', latitud: -34.00, longitud: -71.00 }
    ]);

    expect(component.seleccionados().has('001_0')).toBeTrue();
    expect(component.seleccionados().has('002_0')).toBeTrue();

    const mapBounds = (component as any).map.getBounds();
    expect(mapBounds.contains(L.latLng(-33.40, -70.60))).toBeTrue();
    expect(mapBounds.contains(L.latLng(-34.00, -71.00))).toBeTrue();

    expect((component as any).historialLayer.getLayers().length).toBe(2);
  });

  it('el clic en el marker de un vendedor dibuja su recorrido del día', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${environment.apiUrl}/posicion`).flush([
      { vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: new Date().toISOString(), latitud: -33.40, longitud: -70.60 }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/vendedores`).flush([{ codigo: '001', tipo: '0', nombre: 'Juan Perez' }]);

    const marker = (component as any).markers.get('001');
    expect(marker).toBeTruthy();

    marker.fire('click');

    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 }
    ]);

    expect(component.seleccionados().has('001_0')).toBeTrue();
  });

  it('marcar el checkbox de un vendedor en la lista dibuja su recorrido', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${environment.apiUrl}/posicion`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/vendedores`).flush([{ codigo: '001', tipo: '0', nombre: 'Juan Perez' }]);
    fixture.detectChanges();

    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.vendor-list__checkbox');
    expect(checkbox).toBeTruthy();

    checkbox.dispatchEvent(new Event('change'));

    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 }
    ]);

    expect(component.seleccionados().has('001_0')).toBeTrue();
  });

  it('el checkbox queda sin marcar tras un historial vacío (no debe quedar visualmente marcado)', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${environment.apiUrl}/posicion`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/vendedores`).flush([{ codigo: '002', tipo: '0', nombre: 'Ana Soto' }]);
    fixture.detectChanges();

    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.vendor-list__checkbox');
    expect(checkbox).toBeTruthy();

    checkbox.dispatchEvent(new Event('change'));

    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([]);
    fixture.detectChanges();

    expect(component.seleccionados().has('002_0')).toBeFalse();
    expect(checkbox.checked).toBeFalse();
  });

  it('un doble toggle rápido del mismo vendedor antes de que llegue la respuesta HTTP no dispara una segunda solicitud', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });

    const req = httpMock.expectOne(`${environment.apiUrl}/posicion/historico`);
    req.flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 },
      { id: 2, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:05:00', latitud: -33.41, longitud: -70.61 }
    ]);

    expect(component.seleccionados().has('001_0')).toBeTrue();
    expect((component as any).historialLayer.getLayers().length).toBe(1);

    // Una vez resuelta la solicitud, el toggle nuevamente debe poder ocultar el recorrido.
    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    expect(component.seleccionados().has('001_0')).toBeFalse();
    expect((component as any).historialLayer.getLayers().length).toBe(0);
  });

  it('muestra un toast y no agrega al vendedor a seleccionados si getHistoric falla', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });

    const req = httpMock.expectOne(`${environment.apiUrl}/posicion/historico`);
    req.flush(null, { status: 500, statusText: 'Server Error' });

    expect(component.toastMensaje()).toBe('No se pudo obtener el recorrido de Juan Perez');
    expect(component.seleccionados().has('001_0')).toBeFalse();
  });

  it('al hacer clic en el marker, el checkbox correspondiente en la lista se marca', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${environment.apiUrl}/posicion`).flush([
      { vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: new Date().toISOString(), latitud: -33.40, longitud: -70.60 }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/vendedores`).flush([{ codigo: '001', tipo: '0', nombre: 'Juan Perez' }]);

    const marker = (component as any).markers.get('001');
    marker.fire('click');
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 }
    ]);

    fixture.detectChanges();

    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.vendor-list__checkbox');
    expect(checkbox.checked).toBeTrue();
  });

  it('mostrarTrayectoria dibuja un nodo numerado por cada parada detectada, no un punto por cada posición GPS', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 },
      { id: 2, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:05:00', latitud: -34.00, longitud: -71.00 }
    ]);

    const grupo = (component as any).trayectoriasPorVendedor.get('001_0') as L.LayerGroup;
    const marcadores = grupo.getLayers().filter(capa => capa instanceof L.Marker) as L.Marker[];

    expect(marcadores.length).toBe(2);
    const popups = marcadores.map(m => m.getPopup()?.getContent());
    expect(popups).toContain('Inicio — 09:00');
    expect(popups).toContain('Última posición — 09:05');
  });

  it('mostrarTrayectoria etiqueta una parada real de más de 10 minutos con su rango horario', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 },
      { id: 2, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:10:00', latitud: -34.00, longitud: -71.00 },
      { id: 3, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:25:00', latitud: -34.00, longitud: -71.00 },
      { id: 4, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:40:00', latitud: -35.00, longitud: -72.00 }
    ]);

    const grupo = (component as any).trayectoriasPorVendedor.get('001_0') as L.LayerGroup;
    const marcadores = grupo.getLayers().filter(capa => capa instanceof L.Marker) as L.Marker[];

    expect(marcadores.length).toBe(3);
    const popups = marcadores.map(m => m.getPopup()?.getContent());
    expect(popups).toContain('Inicio — 09:00');
    expect(popups).toContain('Parada 2 — 09:10 a 09:25');
    expect(popups).toContain('Última posición — 09:40');
  });
});

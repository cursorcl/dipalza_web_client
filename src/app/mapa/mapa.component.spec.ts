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
});

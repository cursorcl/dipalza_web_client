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

  it('centrarEnNodoDelMapa centra el mapa en la latitud/longitud recibida', () => {
    component.centrarEnNodoDelMapa({ latitud: -34.5, longitud: -71.9 });

    const centro = (component as any).map.getCenter();
    expect(centro.lat).toBeCloseTo(-34.5, 5);
    expect(centro.lng).toBeCloseTo(-71.9, 5);
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

  it('toggleTrayectoria dibuja el recorrido del día y lo marca como seleccionado', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });

    const req = httpMock.expectOne(`${environment.apiUrl}/posicion/historico`);
    expect(req.request.method).toBe('POST');
    req.flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 },
      { id: 2, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:05:00', latitud: -33.41, longitud: -70.61 }
    ]);

    expect(component.seleccionado()).toBe('001_0');
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
    expect(component.seleccionado()).toBe('001_0');

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });

    expect(component.seleccionado()).toBeNull();
    httpMock.expectNone(`${environment.apiUrl}/posicion/historico`);
  });

  it('toggleTrayectoria muestra un toast si no hay recorrido para hoy', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '002', tipo: '0', nombre: 'Ana Soto' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([]);

    expect(component.toastMensaje()).toBe('Sin recorrido registrado hoy para Ana Soto');
    expect(component.seleccionado()).toBeNull();
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

  it('al seleccionar otro vendedor, se reemplaza el recorrido anterior y la vista se ajusta al nuevo', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 }
    ]);
    expect(component.seleccionado()).toBe('001_0');
    expect((component as any).historialLayer.getLayers().length).toBe(1);

    component.toggleTrayectoria({ codigo: '002', tipo: '0', nombre: 'Ana Soto' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 2, vendedorId: '002', vendedorCodigo: '0', vendedorNombre: 'Ana Soto', fechaHora: '2026-07-26T09:00:00', latitud: -34.00, longitud: -71.00 }
    ]);

    expect(component.seleccionado()).toBe('002_0');
    expect((component as any).historialLayer.getLayers().length).toBe(1);

    const mapBounds = (component as any).map.getBounds();
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

    expect(component.seleccionado()).toBe('001_0');
  });

  it('hacer clic en la fila de un vendedor en la lista dibuja su recorrido', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${environment.apiUrl}/posicion`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/vendedores`).flush([{ codigo: '001', tipo: '0', nombre: 'Juan Perez' }]);
    fixture.detectChanges();

    const fila: HTMLElement = fixture.nativeElement.querySelector('.vendor-list__item');
    expect(fila).toBeTruthy();

    fila.dispatchEvent(new Event('click'));

    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 }
    ]);

    expect(component.seleccionado()).toBe('001_0');
  });

  it('la fila no queda resaltada tras un historial vacío', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${environment.apiUrl}/posicion`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/vendedores`).flush([{ codigo: '002', tipo: '0', nombre: 'Ana Soto' }]);
    fixture.detectChanges();

    const fila: HTMLElement = fixture.nativeElement.querySelector('.vendor-list__item');
    fila.dispatchEvent(new Event('click'));

    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([]);
    fixture.detectChanges();

    expect(component.seleccionado()).toBeNull();
    expect(fila.classList.contains('vendor-list__item--selected')).toBeFalse();
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

    expect(component.seleccionado()).toBe('001_0');
    expect((component as any).historialLayer.getLayers().length).toBe(1);

    // Una vez resuelta la solicitud, el toggle nuevamente debe poder ocultar el recorrido.
    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    expect(component.seleccionado()).toBeNull();
  });

  it('al cambiar de vendedor antes de que la respuesta anterior llegue, solo se muestra el recorrido del último seleccionado', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    // Click vendor A — request in flight, not yet resolved
    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    // seleccionado is still null, request is pending

    // Click vendor B before A's response arrives
    component.toggleTrayectoria({ codigo: '002', tipo: '0', nombre: 'Ana Soto' });
    // Now we have two requests in flight for A and B

    // Collect both pending requests
    const requests = httpMock.match(`${environment.apiUrl}/posicion/historico`);
    expect(requests.length).toBe(2);

    // Resolve A's request first (stale response)
    requests[0].flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 }
    ]);
    // A's trajectory should NOT be displayed because B is now the desired selection

    // Resolve B's request (current selection)
    requests[1].flush([
      { id: 2, vendedorId: '002', vendedorCodigo: '0', vendedorNombre: 'Ana Soto', fechaHora: '2026-07-26T09:00:00', latitud: -34.00, longitud: -71.00 }
    ]);

    // Only B should be in seleccionado and displayed
    expect(component.seleccionado()).toBe('002_0');
    // Should have exactly one trajectory (B's, not A's)
    expect((component as any).historialLayer.getLayers().length).toBe(1);
  });

  it('un tercer clic rápido sobre el primer vendedor (mientras su solicitud sigue en curso) deja a ese vendedor seleccionado al llegar la respuesta', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    // Click vendor A — request in flight, not yet resolved
    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });

    // Click vendor B before A's response arrives — request in flight, desiredSelection becomes B
    component.toggleTrayectoria({ codigo: '002', tipo: '0', nombre: 'Ana Soto' });

    // Click vendor A again: A's request is still in flight, so this hits the
    // `cargando.has(key)` early-return branch. It must still record A as the
    // desired selection instead of leaving it as B.
    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });

    // No new request should have been made for the repeated click on A.
    const requests = httpMock.match(`${environment.apiUrl}/posicion/historico`);
    expect(requests.length).toBe(2);

    // Resolve A's request — since the user's last click was on A, this should display.
    requests[0].flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 }
    ]);

    // Resolve B's now-stale request — must be discarded since A is the desired selection.
    requests[1].flush([
      { id: 2, vendedorId: '002', vendedorCodigo: '0', vendedorNombre: 'Ana Soto', fechaHora: '2026-07-26T09:00:00', latitud: -34.00, longitud: -71.00 }
    ]);

    expect(component.seleccionado()).toBe('001_0');
    expect((component as any).historialLayer.getLayers().length).toBe(1);
  });

  it('muestra un toast y no marca al vendedor como seleccionado si getHistoric falla', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });

    const req = httpMock.expectOne(`${environment.apiUrl}/posicion/historico`);
    req.flush(null, { status: 500, statusText: 'Server Error' });

    expect(component.toastMensaje()).toBe('No se pudo obtener el recorrido de Juan Perez');
    expect(component.seleccionado()).toBeNull();
  });

  it('al hacer clic en el marker, la fila correspondiente en la lista queda resaltada', () => {
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

    const fila: HTMLElement = fixture.nativeElement.querySelector('.vendor-list__item');
    expect(fila.classList.contains('vendor-list__item--selected')).toBeTrue();
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

  it('mostrarTrayectoria puebla nodosSeleccionados con los mismos nodos que dibuja en el mapa', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 },
      { id: 2, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:05:00', latitud: -33.41, longitud: -70.61 }
    ]);
    fixture.detectChanges();

    expect(component.nodosSeleccionados().length).toBe(2);

    // El nuevo <app-tramos-table> dispara sus propias solicitudes de geocodificación;
    // las respondemos para no dejar solicitudes pendientes en el test.
    httpMock.match(`${environment.apiUrl}/geocodificacion/inversa`)
      .forEach(req => req.flush({ calle: 'Calle de prueba' }));
  });

  it('al deseleccionar un vendedor, nodosSeleccionados queda vacío', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 }
    ]);
    fixture.detectChanges();
    httpMock.match(`${environment.apiUrl}/geocodificacion/inversa`)
      .forEach(req => req.flush({ calle: 'Calle de prueba' }));

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });

    expect(component.nodosSeleccionados()).toEqual([]);
  });

  it('al cambiar a otro vendedor, nodosSeleccionados refleja solo los nodos del nuevo vendedor', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 }
    ]);
    fixture.detectChanges();
    httpMock.match(`${environment.apiUrl}/geocodificacion/inversa`)
      .forEach(req => req.flush({ calle: 'Calle de prueba' }));

    expect(component.nodosSeleccionados().length).toBe(1);

    component.toggleTrayectoria({ codigo: '002', tipo: '0', nombre: 'Ana Soto' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 2, vendedorId: '002', vendedorCodigo: '0', vendedorNombre: 'Ana Soto', fechaHora: '2026-07-26T09:00:00', latitud: -34.00, longitud: -71.00 },
      { id: 3, vendedorId: '002', vendedorCodigo: '0', vendedorNombre: 'Ana Soto', fechaHora: '2026-07-26T09:10:00', latitud: -34.10, longitud: -71.10 }
    ]);
    fixture.detectChanges();
    httpMock.match(`${environment.apiUrl}/geocodificacion/inversa`)
      .forEach(req => req.flush({ calle: 'Calle de prueba' }));

    expect(component.nodosSeleccionados().length).toBe(2);
  });
});

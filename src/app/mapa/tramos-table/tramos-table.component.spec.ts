import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { TramosTableComponent } from './tramos-table.component';
import { GeocodificacionService, CalleResponse } from '../geocodificacion.service';
import { NodoParada } from '../detectar-paradas';

describe('TramosTableComponent', () => {
  let component: TramosTableComponent;
  let fixture: ComponentFixture<TramosTableComponent>;
  let geocodificacionServiceSpy: jasmine.SpyObj<GeocodificacionService>;

  const nodoInicio: NodoParada = {
    numero: 1, latitud: -33.04, longitud: -71.62,
    comienzo: '2026-07-31T10:00:00', fin: '2026-07-31T10:00:00',
    esInicio: true, esFin: false, esParada: false
  };
  const nodoParada: NodoParada = {
    numero: 2, latitud: -33.05, longitud: -71.63,
    comienzo: '2026-07-31T10:20:00', fin: '2026-07-31T10:40:00',
    esInicio: false, esFin: false, esParada: true
  };
  const nodoFin: NodoParada = {
    numero: 3, latitud: -33.06, longitud: -71.64,
    comienzo: '2026-07-31T11:00:00', fin: '2026-07-31T11:00:00',
    esInicio: false, esFin: true, esParada: false
  };

  beforeEach(async () => {
    geocodificacionServiceSpy = jasmine.createSpyObj('GeocodificacionService', ['obtenerCalle']);

    await TestBed.configureTestingModule({
      imports: [TramosTableComponent],
      providers: [{ provide: GeocodificacionService, useValue: geocodificacionServiceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(TramosTableComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(of({ calle: 'Calle X' }));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renderiza una fila por nodo, con N°, Tipo y horas ya disponibles de inmediato', () => {
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(new Subject<CalleResponse>().asObservable());
    component.nodos = [nodoInicio, nodoParada, nodoFin];
    component.ngOnChanges({ nodos: {} as any });

    expect(component.filas().length).toBe(3);
    expect(component.filas()[0].numero).toBe(1);
    expect(component.filas()[1].numero).toBe(2);
  });

  it('muestra "Buscando calle…" en el DOM mientras la geocodificación no ha resuelto', () => {
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(new Subject<CalleResponse>().asObservable());
    component.nodos = [nodoInicio];
    fixture.detectChanges();
    component.ngOnChanges({ nodos: {} as any });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Buscando calle');
  });

  it('cada fila resuelve su propia calle de forma independiente, sin esperar a las demás', () => {
    const sujeto1 = new Subject<{ calle: string }>();
    const sujeto2 = new Subject<{ calle: string }>();
    geocodificacionServiceSpy.obtenerCalle.and.returnValues(sujeto1.asObservable(), sujeto2.asObservable());

    component.nodos = [nodoInicio, nodoParada];
    component.ngOnChanges({ nodos: {} as any });

    expect(component.filas()[0].calle).toBeNull();
    expect(component.filas()[1].calle).toBeNull();

    sujeto2.next({ calle: 'Calle Dos' }); // el segundo nodo resuelve primero
    expect(component.filas()[1].calle).toBe('Calle Dos');
    expect(component.filas()[0].calle).toBeNull(); // el primero sigue pendiente

    sujeto1.next({ calle: 'Calle Uno' });
    expect(component.filas()[0].calle).toBe('Calle Uno');
  });

  it('hora de fin de una fila es la hora de comienzo del siguiente nodo', () => {
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(of({ calle: 'Calle X' }));
    component.nodos = [nodoInicio, nodoParada, nodoFin];
    component.ngOnChanges({ nodos: {} as any });

    expect(component.filas()[0].horaFin).toBe('10:20');
    expect(component.filas()[1].horaFin).toBe('11:00');
  });

  it('la última fila no tiene hora de fin (sin siguiente nodo)', () => {
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(of({ calle: 'Calle X' }));
    component.nodos = [nodoInicio, nodoParada, nodoFin];
    component.ngOnChanges({ nodos: {} as any });

    expect(component.filas()[2].horaFin).toBeNull();
  });

  it('la columna Tipo distingue Inicio, Parada N y Última posición', () => {
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(of({ calle: 'Calle X' }));
    component.nodos = [nodoInicio, nodoParada, nodoFin];
    component.ngOnChanges({ nodos: {} as any });

    expect(component.filas()[0].tipo).toBe('Inicio');
    expect(component.filas()[1].tipo).toBe('Parada 2');
    expect(component.filas()[2].tipo).toBe('Última posición');
  });

  it('al hacer clic en el encabezado, colapsa y oculta el cuerpo de la tabla', () => {
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(of({ calle: 'Calle X' }));
    component.nodos = [nodoInicio];
    fixture.detectChanges();

    const header: HTMLElement = fixture.nativeElement.querySelector('.tramos-table__header');
    header.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(component.colapsado()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.tramos-table__body')).toBeNull();
  });

  it('respuestas atrasadas de una selección anterior no corrompen la selección actual', () => {
    const sujeto1 = new Subject<CalleResponse>();
    const sujeto2 = new Subject<CalleResponse>();

    // Primera selección: nodoInicio
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(sujeto1.asObservable());
    component.nodos = [nodoInicio];
    component.ngOnChanges({ nodos: {} as any });

    expect(component.filas()[0].calle).toBeNull(); // pendiente

    // Segunda selección: nodoParada (nueva generación)
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(sujeto2.asObservable());
    component.nodos = [nodoParada];
    component.ngOnChanges({ nodos: {} as any });

    expect(component.filas()[0].numero).toBe(2); // ahora el array tiene nodoParada
    expect(component.filas()[0].calle).toBeNull(); // pendiente de sujeto2

    // Resuelve la primera selección (ahora stale)
    sujeto1.next({ calle: 'Calle Vieja' });

    // La fila no debe cambiar — debe seguir pendiente de sujeto2
    expect(component.filas()[0].calle).toBeNull();

    // Resuelve la segunda selección (actual)
    sujeto2.next({ calle: 'Calle Nueva' });
    expect(component.filas()[0].calle).toBe('Calle Nueva');
  });

  it('si geocodificacionService falla, muestra "Calle no disponible"', () => {
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(throwError(() => new Error('Network error')));
    component.nodos = [nodoInicio];
    component.ngOnChanges({ nodos: {} as any });

    expect(component.filas()[0].calle).toBe('Calle no disponible');
  });

  it('nodo simultáneamente esInicio y esParada muestra "Parada N" (prioridad a parada)', () => {
    const nodoInicioParada: NodoParada = {
      numero: 1, latitud: -33.04, longitud: -71.62,
      comienzo: '2026-07-31T10:00:00', fin: '2026-07-31T10:20:00',
      esInicio: true, esFin: false, esParada: true
    };
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(of({ calle: 'Calle X' }));
    component.nodos = [nodoInicioParada];
    component.ngOnChanges({ nodos: {} as any });

    expect(component.filas()[0].tipo).toBe('Parada 1');
  });
});

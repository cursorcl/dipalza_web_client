import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HistorialPanelComponent } from './historial-panel.component';
import { HistorialResumenDiaDTO } from '../models/model';

describe('HistorialPanelComponent', () => {
  let component: HistorialPanelComponent;
  let fixture: ComponentFixture<HistorialPanelComponent>;

  const fechaEjemplo: HistorialResumenDiaDTO = {
    dia: '2026-08-10',
    cantidadPuntos: 120,
    horaInicio: '2026-08-10T10:00:00',
    horaFin: '2026-08-10T19:00:00'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistorialPanelComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HistorialPanelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('muestra el nombre del vendedor en el encabezado', () => {
    component.vendedorNombre = 'Juan Perez';
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Juan Perez');
  });

  it('muestra un mensaje de carga mientras cargando es true', () => {
    component.cargando = true;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cargando historial');
  });

  it('muestra un mensaje de "sin historial" cuando no hay fechas y no está cargando', () => {
    component.cargando = false;
    component.fechas = [];
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Sin historial disponible');
  });

  it('renderiza una fila por cada fecha con cantidad de puntos, hora de inicio y hora de fin', () => {
    component.fechas = [fechaEjemplo];
    fixture.detectChanges();

    const fila: HTMLElement = fixture.nativeElement.querySelector('.historial-panel__fila');
    expect(fila).toBeTruthy();
    expect(fila.textContent).toContain('120');
    expect(fila.textContent).toContain('10:00');
    expect(fila.textContent).toContain('19:00');
  });

  it('emite fechaSeleccionada con el día al hacer clic en una fila', () => {
    component.fechas = [fechaEjemplo];
    fixture.detectChanges();

    const emitidos: string[] = [];
    component.fechaSeleccionada.subscribe((dia) => emitidos.push(dia));

    const fila: HTMLElement = fixture.nativeElement.querySelector('.historial-panel__fila');
    fila.dispatchEvent(new Event('click'));

    expect(emitidos).toEqual(['2026-08-10']);
  });

  it('emite cerrar al hacer clic en el botón de cerrar', () => {
    fixture.detectChanges();

    let cerrado = false;
    component.cerrar.subscribe(() => (cerrado = true));

    const boton: HTMLElement = fixture.nativeElement.querySelector('.historial-panel__cerrar');
    boton.dispatchEvent(new Event('click'));

    expect(cerrado).toBeTrue();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '@core';
import { ReporteUbicacionesDialogComponent } from './reporte-ubicaciones-dialog.component';
import { ReporteCancelado, ReporteUbicacionesService, SolicitudReporte } from '../reporte-ubicaciones.service';
import { VendedorListItem } from '../../models/model';

function vendedor(id: string, nombre: string): VendedorListItem {
  return {
    vendedorId: id,
    vendedorCodigo: '0',
    vendedorNombre: nombre,
    color: 'hsl(0, 70%, 50%)',
    fechaHora: new Date().toISOString(),
    tiempoRelativo: '5 segundos',
    online: true,
  };
}

describe('ReporteUbicacionesDialogComponent', () => {
  let fixture: ComponentFixture<ReporteUbicacionesDialogComponent>;
  let componente: ReporteUbicacionesDialogComponent;
  let servicio: { generar: jasmine.Spy };
  let modal: { close: jasmine.Spy; dismiss: jasmine.Spy };
  const hoy = new Date().toLocaleDateString('en-CA');

  function crear(vendedores: VendedorListItem[]) {
    fixture = TestBed.createComponent(ReporteUbicacionesDialogComponent);
    componente = fixture.componentInstance;
    componente.vendedores = vendedores;
    fixture.detectChanges();
  }

  const boton = (texto: string): HTMLButtonElement =>
    Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find(b => b.textContent?.trim() === texto)!;

  function fijarFecha(id: string, valor: string) {
    const input: HTMLInputElement = fixture.nativeElement.querySelector(id);
    input.value = valor;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    servicio = { generar: jasmine.createSpy('generar') };
    modal = { close: jasmine.createSpy('close'), dismiss: jasmine.createSpy('dismiss') };
    await TestBed.configureTestingModule({
      imports: [ReporteUbicacionesDialogComponent],
      providers: [
        { provide: ReporteUbicacionesService, useValue: servicio },
        { provide: NgbActiveModal, useValue: modal },
        { provide: AuthService, useValue: { currentUserValue: { firstName: 'Ana', lastName: 'Soto' } } },
      ],
    }).compileComponents();
  });

  it('por defecto desde y hasta son hoy y "Generar PDF" está deshabilitado sin vendedores', () => {
    crear([vendedor('001', 'Ana')]);
    expect(componente.desde()).toBe(hoy);
    expect(componente.hasta()).toBe(hoy);
    expect(boton('Generar PDF').disabled).toBeTrue();
  });

  it('"Seleccionar todos" marca todos y habilita el botón', () => {
    crear([vendedor('001', 'Ana'), vendedor('002', 'Beto')]);
    boton('Seleccionar todos').click();
    fixture.detectChanges();
    expect(componente.seleccionados().size).toBe(2);
    expect(boton('Generar PDF').disabled).toBeFalse();
    expect(boton('Quitar todos')).toBeTruthy();
  });

  it('un rango de 32 días muestra "El rango no puede superar 31 días" y deshabilita el botón', () => {
    crear([vendedor('001', 'Ana')]);
    boton('Seleccionar todos').click();
    fijarFecha('#reporte-desde', '2026-01-01');
    fijarFecha('#reporte-hasta', '2026-02-01');
    expect(fixture.nativeElement.textContent).toContain('El rango no puede superar 31 días');
    expect(boton('Generar PDF').disabled).toBeTrue();
  });

  it('muestra el aviso de volumen con 10 vendedores y 11 días', () => {
    crear(Array.from({ length: 10 }, (_, i) => vendedor(`00${i}`, `V${i}`)));
    boton('Seleccionar todos').click();
    fijarFecha('#reporte-desde', '2026-01-01');
    fijarFecha('#reporte-hasta', '2026-01-11');
    const aviso = fixture.nativeElement.querySelector('[role="status"]');
    expect(aviso.textContent).toContain('El reporte tendrá muchas páginas');
  });

  it('al generar llama a generar() con los vendedores seleccionados y el rango, y descarga el blob', async () => {
    const blob = new Blob(['pdf']);
    servicio.generar.and.resolveTo({ blob, nombre: 'reporte-ubicaciones_2026-01-01.pdf' });
    const crearUrl = spyOn(URL, 'createObjectURL').and.returnValue('blob:falso');
    const revocar = spyOn(URL, 'revokeObjectURL');
    const clic = spyOn(HTMLAnchorElement.prototype, 'click').and.stub();
    crear([vendedor('001', 'Ana'), vendedor('002', 'Beto')]);
    fixture.nativeElement.querySelectorAll('input[type="checkbox"]')[1].click();
    fijarFecha('#reporte-desde', '2026-01-01');
    fijarFecha('#reporte-hasta', '2026-01-01');

    await componente.generar();

    const solicitud: SolicitudReporte = servicio.generar.calls.mostRecent().args[0];
    expect(solicitud.vendedores).toEqual([{ codigo: '002', tipo: '0', nombre: 'Beto' }]);
    expect(solicitud.desde).toBe('2026-01-01');
    expect(solicitud.hasta).toBe('2026-01-01');
    expect(solicitud.usuario).toBe('Ana Soto');
    expect(crearUrl).toHaveBeenCalledWith(blob);
    expect(clic).toHaveBeenCalled();
    expect(revocar).toHaveBeenCalledWith('blob:falso');
    expect(modal.close).toHaveBeenCalled();
  });

  it('cancelar aborta la señal y deja el formulario editable', async () => {
    let senal!: AbortSignal;
    servicio.generar.and.callFake((_s: SolicitudReporte, _p: unknown, s: AbortSignal) => {
      senal = s;
      return new Promise((_, rechazar) => s.addEventListener('abort', () => rechazar(new ReporteCancelado())));
    });
    crear([vendedor('001', 'Ana')]);
    boton('Seleccionar todos').click();
    const promesa = componente.generar();
    fixture.detectChanges();
    expect(componente.generando()).toBeTrue();

    boton('Cancelar').click();
    await promesa;
    fixture.detectChanges();

    expect(senal.aborted).toBeTrue();
    expect(componente.generando()).toBeFalse();
    expect(componente.error()).toBeNull();
    expect(modal.close).not.toHaveBeenCalled();
  });

  it('un error distinto de cancelación se muestra y deja el formulario editable', async () => {
    servicio.generar.and.rejectWith(new Error('falló la red'));
    crear([vendedor('001', 'Ana')]);
    boton('Seleccionar todos').click();
    await componente.generar();
    fixture.detectChanges();
    expect(componente.generando()).toBeFalse();
    expect(fixture.nativeElement.textContent).toContain('falló la red');
  });
});

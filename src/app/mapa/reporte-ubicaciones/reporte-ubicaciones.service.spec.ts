import { TestBed } from '@angular/core/testing';
import { Observable, of, Subject, throwError } from 'rxjs';
import { PositionsService } from '../positions.service';
import { ParadasService } from '../paradas.service';
import { ProgresoReporte, ReporteCancelado, ReporteUbicacionesService, SolicitudReporte } from './reporte-ubicaciones.service';

const pos = (fechaHora: string) => ({ fechaHora, latitud: -33, longitud: -70 }) as any;

describe('ReporteUbicacionesService', () => {
  let servicio: ReporteUbicacionesService;
  let getHistoric: jasmine.Spy;
  let getHistorico: jasmine.Spy;
  let renderizador: jasmine.Spy;

  const solicitud: SolicitudReporte = {
    vendedores: [
      { codigo: '2', tipo: 'V', nombre: 'Juan' },
      { codigo: '1', tipo: 'V', nombre: 'Ana' },
    ],
    desde: '2026-11-01',
    hasta: '2026-11-02',
    usuario: 'admin',
  };

  beforeEach(() => {
    getHistoric = jasmine.createSpy('getHistoric').and.returnValue(of([pos('2026-11-01T10:00:00')]));
    getHistorico = jasmine.createSpy('getHistorico').and.returnValue(of([]));
    TestBed.configureTestingModule({
      providers: [
        { provide: PositionsService, useValue: { getHistoric } },
        { provide: ParadasService, useValue: { getHistorico } },
      ],
    });
    servicio = TestBed.inject(ReporteUbicacionesService);
    renderizador = jasmine.createSpy('renderizador').and.resolveTo('data:image/jpeg;base64,xx');
    servicio.renderizador = renderizador;
  });

  it('procesa los vendedores en orden alfabético y llama al renderizador una vez por día con datos', async () => {
    const resultado = await servicio.generar(solicitud, () => {}, new AbortController().signal);
    expect(getHistoric.calls.allArgs().map(a => a[0].vendedorIds[0].codigo)).toEqual(['1', '2']);
    expect(renderizador).toHaveBeenCalledTimes(2);
    expect(resultado.nombre).toBe('reporte-ubicaciones_2026-11-01_2026-11-02.pdf');
    expect(resultado.blob.size).toBeGreaterThan(0);
  });

  it('informa el progreso "Vendedor 1 de 2 — día 1 de 1"', async () => {
    const progresos: ProgresoReporte[] = [];
    await servicio.generar(solicitud, p => progresos.push({ ...p }), new AbortController().signal);
    expect(progresos[0]).toEqual({
      vendedorActual: 1, totalVendedores: 2, diaActual: 1, totalDias: 1, texto: 'Vendedor 1 de 2 — día 1 de 1',
    });
  });

  it('si un vendedor falla, rechaza con "No se pudieron obtener los datos de Juan" y no sigue con el resto', async () => {
    const solo: SolicitudReporte = {
      ...solicitud,
      vendedores: [
        { codigo: '2', tipo: 'V', nombre: 'Juan' },
        { codigo: '3', tipo: 'V', nombre: 'Zoe' },
      ],
    };
    getHistoric.and.returnValue(throwError(() => new Error('http 500')));
    await expectAsync(servicio.generar(solo, () => {}, new AbortController().signal))
      .toBeRejectedWithError('No se pudieron obtener los datos de Juan');
    expect(getHistoric).toHaveBeenCalledTimes(1);
  });

  it('si se aborta con una petición en vuelo, rechaza con ReporteCancelado', async () => {
    const nunca = new Subject<any[]>();
    getHistoric.and.returnValue(nunca as Observable<any[]>);
    const controller = new AbortController();
    const promesa = servicio.generar(solicitud, () => {}, controller.signal);
    controller.abort();
    await expectAsync(promesa).toBeRejectedWithError(ReporteCancelado);
  });

  it('si se aborta mientras se renderiza un día, rechaza con ReporteCancelado sin seguir', async () => {
    const controller = new AbortController();
    renderizador.and.callFake(async () => { controller.abort(); return 'x'; });
    await expectAsync(servicio.generar(solicitud, () => {}, controller.signal))
      .toBeRejectedWithError(ReporteCancelado);
    expect(renderizador).toHaveBeenCalledTimes(1);
  });

  it('si el renderizador queda colgado y se aborta, rechaza con ReporteCancelado', async () => {
    const controller = new AbortController();
    renderizador.and.callFake((_dia: any, _color: string, senal: AbortSignal) =>
      new Promise((_res, rej) => senal.addEventListener('abort', () => rej(new DOMException('Cancelado', 'AbortError')))));
    const promesa = servicio.generar(solicitud, () => {}, controller.signal);
    setTimeout(() => controller.abort(), 10);
    await expectAsync(promesa).toBeRejectedWithError(ReporteCancelado);
  });

  it('pasa la señal al renderizador', async () => {
    const controller = new AbortController();
    await servicio.generar(solicitud, () => {}, controller.signal);
    expect(renderizador.calls.argsFor(0)[2]).toBe(controller.signal);
  });
});

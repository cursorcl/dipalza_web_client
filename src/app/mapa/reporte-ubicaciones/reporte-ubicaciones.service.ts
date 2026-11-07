import { inject, Injectable } from '@angular/core';
import { forkJoin, fromEvent, lastValueFrom, takeUntil } from 'rxjs';
import { HistorialPosicionDTO, ParadaVendedorDTO } from '../models/model';
import { ParadasService } from '../paradas.service';
import { PositionsService } from '../positions.service';
import { colorForVendedor } from '../vendor-color';
import { agruparPorDia, DiaReporte, filtroRango, nombreArchivo } from './datos-reporte';
import { DocumentoReporte, VendedorReporte } from './documento-reporte';
import { renderizarMapaDia } from './mapa-estatico';

export interface ProgresoReporte {
  vendedorActual: number;
  totalVendedores: number;
  diaActual: number;
  totalDias: number;
  /** Ej.: 'Vendedor 3 de 12 — día 2 de 5' */
  texto: string;
}

export interface SolicitudReporte {
  vendedores: VendedorReporte[];
  desde: string;
  hasta: string;
  usuario: string | null;
}

export class ReporteCancelado extends Error {
  constructor() {
    super('Generación del reporte cancelada');
    this.name = 'ReporteCancelado';
    Object.setPrototypeOf(this, ReporteCancelado.prototype);
  }
}

@Injectable({ providedIn: 'root' })
export class ReporteUbicacionesService {
  private readonly posiciones = inject(PositionsService);
  private readonly paradas = inject(ParadasService);

  /** Reemplazable en pruebas para no hacer red ni usar canvas. */
  renderizador: (dia: DiaReporte, color: string, senal: AbortSignal) => Promise<string> =
    (dia, color, senal) => renderizarMapaDia(dia, color, undefined, senal);

  async generar(
    solicitud: SolicitudReporte,
    alProgresar: (p: ProgresoReporte) => void,
    senal: AbortSignal,
  ): Promise<{ blob: Blob; nombre: string }> {
    const vendedores = [...solicitud.vendedores].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    const doc = new DocumentoReporte(
      { desde: solicitud.desde, hasta: solicitud.hasta, generadoEn: new Date(), usuario: solicitud.usuario },
      vendedores.length,
    );

    for (let i = 0; i < vendedores.length; i++) {
      this.verificarCancelacion(senal);
      const vendedor = vendedores[i];
      const dias = await this.obtenerDias(vendedor, solicitud, senal);
      const informar = (diaActual: number) => {
        const texto = `Vendedor ${i + 1} de ${vendedores.length} — día ${diaActual} de ${dias.length}`;
        alProgresar({
          vendedorActual: i + 1, totalVendedores: vendedores.length,
          diaActual, totalDias: dias.length, texto,
        });
      };
      if (dias.length === 0) informar(0);

      const imagenes: string[] = [];
      const color = colorForVendedor(`${vendedor.codigo}_${vendedor.tipo}`);
      for (let d = 0; d < dias.length; d++) {
        this.verificarCancelacion(senal);
        informar(d + 1);
        try {
          imagenes.push(await this.renderizador(dias[d], color, senal));
        } catch (error) {
          this.verificarCancelacion(senal);
          throw error;
        }
        this.verificarCancelacion(senal);
      }
      doc.agregarVendedor(vendedor, dias, imagenes);
    }

    this.verificarCancelacion(senal);
    return { blob: doc.finalizar(), nombre: nombreArchivo(solicitud.desde, solicitud.hasta) };
  }

  private verificarCancelacion(senal: AbortSignal): void {
    if (senal.aborted) throw new ReporteCancelado();
  }

  private async obtenerDias(
    vendedor: VendedorReporte, solicitud: SolicitudReporte, senal: AbortSignal,
  ): Promise<DiaReporte[]> {
    const filtro = filtroRango({ codigo: vendedor.codigo, tipo: vendedor.tipo }, solicitud.desde, solicitud.hasta);
    let datos: [HistorialPosicionDTO[], ParadaVendedorDTO[]] | null;
    try {
      datos = await lastValueFrom(
        forkJoin([this.posiciones.getHistoric(filtro), this.paradas.getHistorico(filtro)])
          .pipe(takeUntil(fromEvent(senal, 'abort'))),
        { defaultValue: null },
      );
    } catch {
      throw new Error(`No se pudieron obtener los datos de ${vendedor.nombre}`);
    }
    // takeUntil completa sin emitir cuando se aborta: se traduce a cancelación.
    this.verificarCancelacion(senal);
    return agruparPorDia(datos![0], datos![1]);
  }
}

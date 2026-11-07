import { HistorialPosicionDTO, ParadaVendedorDTO, PositionFilter, VendedorId } from '../models/model';

export const MAX_DIAS_REPORTE = 31;
export const UMBRAL_AVISO_PAGINAS = 100;

export interface DiaReporte {
  fecha: string;
  posiciones: HistorialPosicionDTO[];
  paradas: ParadaVendedorDTO[];
}

const MS_DIA = 24 * 60 * 60 * 1000;

/** Construye una fecha local a partir de 'YYYY-MM-DD'. */
function fechaLocal(fecha: string): Date {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Agrupa por día (prefijo YYYY-MM-DD). Los días sin posiciones no aparecen. */
export function agruparPorDia(posiciones: HistorialPosicionDTO[], paradas: ParadaVendedorDTO[]): DiaReporte[] {
  const dias = new Map<string, DiaReporte>();
  for (const p of posiciones) {
    const fecha = p.fechaHora.slice(0, 10);
    if (!dias.has(fecha)) dias.set(fecha, { fecha, posiciones: [], paradas: [] });
    dias.get(fecha)!.posiciones.push(p);
  }
  for (const pa of paradas) {
    dias.get(pa.horaInicio.slice(0, 10))?.paradas.push(pa);
  }
  return [...dias.values()]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map(d => ({
      fecha: d.fecha,
      posiciones: [...d.posiciones].sort((a, b) => a.fechaHora.localeCompare(b.fechaHora)),
      paradas: [...d.paradas].sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
    }));
}

/** Cantidad de días del rango, inclusivo. */
export function cantidadDias(desde: string, hasta: string): number {
  return Math.round((fechaLocal(hasta).getTime() - fechaLocal(desde).getTime()) / MS_DIA) + 1;
}

export function validarRango(desde: string, hasta: string): string | null {
  if (!desde || !hasta) return 'Debe indicar ambas fechas';
  const dias = cantidadDias(desde, hasta);
  if (dias < 1) return 'La fecha final no puede ser anterior a la inicial';
  if (dias > MAX_DIAS_REPORTE) return `El rango no puede superar ${MAX_DIAS_REPORTE} días`;
  return null;
}

export function superaUmbralAviso(cantidadVendedores: number, dias: number): boolean {
  return cantidadVendedores * dias > UMBRAL_AVISO_PAGINAS;
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** Duración 'hh:mm'; si no hay fin se usa `ahora`. */
export function formatearDuracion(inicio: string, fin: string | null, ahora: Date): string {
  const fechaFin = fin ? new Date(fin) : ahora;
  const minutos = Math.max(0, Math.floor((fechaFin.getTime() - new Date(inicio).getTime()) / 60000));
  return `${dosDigitos(Math.floor(minutos / 60))}:${dosDigitos(minutos % 60)}`;
}

export function formatearHora(fechaHora: string): string {
  return fechaHora.slice(11, 16);
}

export function formatearFechaLarga(fecha: string): string {
  const f = fechaLocal(fecha);
  const parte = (opciones: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-CL', opciones).format(f);
  return `${parte({ weekday: 'long' })} ${f.getDate()} de ${parte({ month: 'long' })} de ${f.getFullYear()}`;
}

export function nombreArchivo(desde: string, hasta: string): string {
  return desde === hasta
    ? `reporte-ubicaciones_${desde}.pdf`
    : `reporte-ubicaciones_${desde}_${hasta}.pdf`;
}

export function filtroRango(vendedor: VendedorId, desde: string, hasta: string): PositionFilter {
  return { vendedorIds: [vendedor], desde: `${desde}T00:00:00`, hasta: `${hasta}T23:59:59` };
}

import { HistorialPosicionDTO, ParadaVendedorDTO } from '../models/model';
import {
  agruparPorDia, cantidadDias, validarRango, superaUmbralAviso, formatearDuracion,
  formatearHora, formatearFechaLarga, nombreArchivo, filtroRango,
} from './datos-reporte';

const pos = (id: number, fechaHora: string): HistorialPosicionDTO => ({
  id, vendedorId: '001_0', vendedorCodigo: '001', vendedorNombre: 'V', fechaHora, latitud: 0, longitud: 0,
});
const parada = (id: number, horaInicio: string): ParadaVendedorDTO => ({
  id, vendedorId: '001_0', vendedorCodigo: '001', vendedorNombre: 'V', latitud: 0, longitud: 0,
  calle: null, horaInicio, horaFin: null, enCurso: false,
} as ParadaVendedorDTO);

describe('datos-reporte', () => {
  describe('agruparPorDia', () => {
    it('agrupa y ordena días y posiciones desordenadas', () => {
      const r = agruparPorDia([
        pos(3, '2026-11-07T09:00:00'), pos(2, '2026-11-06T10:00:00'), pos(1, '2026-11-06T08:00:00'),
      ], []);
      expect(r.map(d => d.fecha)).toEqual(['2026-11-06', '2026-11-07']);
      expect(r[0].posiciones.map(p => p.id)).toEqual([1, 2]);
    });
    it('asigna paradas a su día, ordenadas por horaInicio', () => {
      const r = agruparPorDia([pos(1, '2026-11-06T08:00:00')],
        [parada(2, '2026-11-06T12:00:00'), parada(1, '2026-11-06T09:00:00')]);
      expect(r[0].paradas.map(p => p.id)).toEqual([1, 2]);
    });
    it('descarta paradas de días sin posiciones', () => {
      const r = agruparPorDia([pos(1, '2026-11-06T08:00:00')], [parada(1, '2026-11-08T09:00:00')]);
      expect(r.length).toBe(1);
      expect(r[0].paradas).toEqual([]);
    });
    it('entradas vacías devuelven []', () => {
      expect(agruparPorDia([], [])).toEqual([]);
    });
  });

  it('cantidadDias', () => {
    expect(cantidadDias('2026-10-01', '2026-10-31')).toBe(31);
    expect(cantidadDias('2026-11-06', '2026-11-06')).toBe(1);
  });

  it('validarRango', () => {
    expect(validarRango('2026-10-01', '2026-10-31')).toBeNull();
    expect(validarRango('2026-10-01', '2026-11-01')).toBe('El rango no puede superar 31 días');
    expect(validarRango('2026-11-06', '2026-11-05')).toBe('La fecha final no puede ser anterior a la inicial');
    expect(validarRango('', '2026-11-05')).toBe('Debe indicar ambas fechas');
  });

  it('superaUmbralAviso', () => {
    expect(superaUmbralAviso(10, 10)).toBeFalse();
    expect(superaUmbralAviso(10, 11)).toBeTrue();
  });

  it('formatearDuracion', () => {
    const ahora = new Date(2026, 10, 6, 10, 30, 0);
    expect(formatearDuracion('2026-11-06T10:00:00', '2026-11-06T11:05:00', ahora)).toBe('01:05');
    expect(formatearDuracion('2026-11-06T10:00:00', null, ahora)).toBe('00:30');
  });

  it('formatearHora', () => {
    expect(formatearHora('2026-11-06T09:05:33')).toBe('09:05');
  });

  it('formatearFechaLarga', () => {
    expect(formatearFechaLarga('2026-11-06')).toBe('viernes 6 de noviembre de 2026');
  });

  it('nombreArchivo', () => {
    expect(nombreArchivo('2026-11-06', '2026-11-06')).toBe('reporte-ubicaciones_2026-11-06.pdf');
    expect(nombreArchivo('2026-10-01', '2026-10-31')).toBe('reporte-ubicaciones_2026-10-01_2026-10-31.pdf');
  });

  it('filtroRango', () => {
    expect(filtroRango({ codigo: '001', tipo: '0' }, '2026-11-06', '2026-11-07')).toEqual({
      vendedorIds: [{ codigo: '001', tipo: '0' }], desde: '2026-11-06T00:00:00', hasta: '2026-11-07T23:59:59.999',
    });
  });
});

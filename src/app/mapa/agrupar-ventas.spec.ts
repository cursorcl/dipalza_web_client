import { agruparVentasPorLugar, etiquetaGrupo } from './agrupar-ventas';
import { VentaPosicionDTO } from './models/model';

const venta = (numero: number, lat: number | null, lon: number | null): VentaPosicionDTO => ({
  numero, ventaId: 100 + numero, nombreCliente: `Cliente ${numero}`,
  inicioHora: null, finHora: '2026-11-21T10:00:00', finLat: lat, finLon: lon,
  tiempoTotalMinutos: null, reaperturas: 0, total: 0
});

describe('agruparVentasPorLugar', () => {
  it('junta las ventas a menos de 30 m y deja separadas las lejanas', () => {
    const grupos = agruparVentasPorLugar([
      venta(1, -32.8800, -71.2500),
      venta(2, -32.8801, -71.2501),   // ~14 m de la 1
      venta(3, -32.8900, -71.2600),   // ~1,4 km
      venta(4, -32.88005, -71.25005)  // ~7 m de la 1
    ]);

    expect(grupos.length).toBe(2);
    expect(grupos[0].ventas.map(v => v.numero)).toEqual([1, 2, 4]);
    expect(grupos[1].ventas.map(v => v.numero)).toEqual([3]);
  });

  it('omite las ventas sin posición', () => {
    const grupos = agruparVentasPorLugar([venta(1, null, null), venta(2, -32.88, -71.25)]);

    expect(grupos.length).toBe(1);
    expect(grupos[0].ventas.map(v => v.numero)).toEqual([2]);
  });

  it('ubica el grupo en la posición de su primera venta', () => {
    const [grupo] = agruparVentasPorLugar([venta(1, -32.88, -71.25), venta(2, -32.8801, -71.2501)]);

    expect(grupo.latitud).toBe(-32.88);
    expect(grupo.longitud).toBe(-71.25);
  });
});

describe('etiquetaGrupo', () => {
  it('una sola venta muestra su número', () => {
    expect(etiquetaGrupo({ latitud: 0, longitud: 0, ventas: [venta(3, 0, 0)] })).toBe('3');
  });

  it('varias ventas muestran el último número con "+"', () => {
    expect(etiquetaGrupo({ latitud: 0, longitud: 0, ventas: [venta(2, 0, 0), venta(5, 0, 0)] })).toBe('5+');
  });
});

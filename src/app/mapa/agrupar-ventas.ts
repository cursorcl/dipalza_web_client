import { VentaPosicionDTO } from './models/model';

/** Ventas finalizadas en un mismo lugar: se dibujan como un solo marcador. */
export interface GrupoVentas {
  latitud: number;
  longitud: number;
  /** Ordenadas por número de venta. */
  ventas: VentaPosicionDTO[];
}

/** Distancia bajo la cual dos ventas se consideran hechas en el mismo lugar. */
export const RADIO_MISMO_LUGAR_METROS = 30;

/**
 * Agrupa las ventas con posición que quedan a menos de [radioMetros] de la
 * primera venta de un grupo (así el marcador queda donde se hizo la primera).
 * Las ventas sin posición se omiten: no se pueden dibujar.
 */
export function agruparVentasPorLugar(
  ventas: VentaPosicionDTO[], radioMetros = RADIO_MISMO_LUGAR_METROS
): GrupoVentas[] {
  const grupos: GrupoVentas[] = [];
  for (const venta of ventas) {
    if (venta.finLat == null || venta.finLon == null) continue;
    const grupo = grupos.find(g => distanciaMetros(g.latitud, g.longitud, venta.finLat!, venta.finLon!) < radioMetros);
    if (grupo) {
      grupo.ventas.push(venta);
    } else {
      grupos.push({ latitud: venta.finLat, longitud: venta.finLon, ventas: [venta] });
    }
  }
  grupos.forEach(g => g.ventas.sort((a, b) => a.numero - b.numero));
  return grupos;
}

/**
 * Texto del marcador: el número de orden si hay una venta; la cantidad con "×"
 * si hay varias ("×3"), para que no se confunda con el número de una venta.
 */
export function etiquetaGrupo(grupo: GrupoVentas): string {
  return grupo.ventas.length === 1 ? `${grupo.ventas[0].numero}` : `×${grupo.ventas.length}`;
}

/** Tooltip del marcador: "Venta 3" o "3 ventas: 2, 4 y 5". */
export function resumenGrupo(grupo: GrupoVentas): string {
  const numeros = grupo.ventas.map(v => v.numero);
  if (numeros.length === 1) return `Venta ${numeros[0]}`;
  const ultimo = numeros.pop();
  return `${grupo.ventas.length} ventas: ${numeros.join(', ')} y ${ultimo}`;
}

function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radioTierra = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radioTierra * Math.asin(Math.sqrt(a));
}

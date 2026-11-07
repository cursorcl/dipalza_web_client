import * as L from 'leaflet';
import { MAPA_CONFIG } from '../mapa.config';
import { DiaReporte } from './datos-reporte';

export const ANCHO_MAPA_PX = 1600;
export const ALTO_MAPA_PX = 1000;
export const ZOOM_MAXIMO_REPORTE = 16;

const TAM_MOSAICO = 256;
const MARGEN_PX = 60;

export interface Encuadre {
  zoom: number;
  /** Esquina superior izquierda en píxeles del mundo a ese zoom. */
  origen: { x: number; y: number };
}

/** Tiempo máximo de espera por un mosaico antes de darlo por perdido. */
export const TIMEOUT_MOSAICO_MS = 12000;

/** Carga un mosaico; devuelve null si no cargó, venció el tiempo o se abortó la señal. */
export type CargadorMosaico = (url: string, senal?: AbortSignal) => Promise<CanvasImageSource | null>;

export const cargarMosaicoOsm: CargadorMosaico = (url, senal) =>
  new Promise(resolve => {
    if (senal?.aborted) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const terminar = (resultado: CanvasImageSource | null) => {
      clearTimeout(timer);
      senal?.removeEventListener('abort', alAbortar);
      if (resultado === null) {
        img.onload = img.onerror = null;
        img.src = '';
      }
      resolve(resultado);
    };
    const alAbortar = () => terminar(null);
    timer = setTimeout(() => terminar(null), TIMEOUT_MOSAICO_MS);
    senal?.addEventListener('abort', alAbortar);
    img.onload = () => terminar(img);
    img.onerror = () => terminar(null);
    img.src = url;
  });

/** Zoom más alto (hasta zoomMaximo) en que el bbox de los puntos cabe en el lienzo menos el margen. */
export function calcularEncuadre(
  puntos: { latitud: number; longitud: number }[],
  ancho: number,
  alto: number,
  margenPx: number,
  zoomMaximo: number,
): Encuadre {
  const proyectar = (p: { latitud: number; longitud: number }, z: number) =>
    L.CRS.EPSG3857.latLngToPoint(L.latLng(p.latitud, p.longitud), z);

  let zoom = 0;
  for (let z = zoomMaximo; z >= 0; z--) {
    const { minX, maxX, minY, maxY } = limites(puntos.map(p => proyectar(p, z)));
    if (maxX - minX <= ancho - 2 * margenPx && maxY - minY <= alto - 2 * margenPx) {
      zoom = z;
      break;
    }
  }
  const { minX, maxX, minY, maxY } = limites(puntos.map(p => proyectar(p, zoom)));
  return { zoom, origen: { x: (minX + maxX) / 2 - ancho / 2, y: (minY + maxY) / 2 - alto / 2 } };
}

function limites(ps: { x: number; y: number }[]) {
  const xs = ps.map(p => p.x);
  const ys = ps.map(p => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

function urlMosaico(x: number, y: number, z: number): string {
  return MAPA_CONFIG.tileUrl
    .replace('{s}', 'abc'[(x + y) % 3])
    .replace('{z}', String(z))
    .replace('{x}', String(x))
    .replace('{y}', String(y));
}

/** Promesa que se resuelve al abortar la señal; nunca se resuelve si no hay señal. */
function esperarAborto(senal?: AbortSignal): Promise<void> {
  return new Promise(resolve => {
    if (!senal) return;
    if (senal.aborted) resolve();
    else senal.addEventListener('abort', () => resolve(), { once: true });
  });
}

/** Dibuja el recorrido del día sobre mosaicos de OSM y devuelve un dataURL JPEG. */
export async function renderizarMapaDia(
  dia: DiaReporte,
  color: string,
  cargar: CargadorMosaico = cargarMosaicoOsm,
  senal?: AbortSignal,
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = ANCHO_MAPA_PX;
  canvas.height = ALTO_MAPA_PX;
  const ctx = canvas.getContext('2d')!;

  const { zoom, origen } = calcularEncuadre(dia.posiciones, ANCHO_MAPA_PX, ALTO_MAPA_PX, MARGEN_PX, ZOOM_MAXIMO_REPORTE);
  const aPantalla = (p: { latitud: number; longitud: number }) => {
    const q = L.CRS.EPSG3857.latLngToPoint(L.latLng(p.latitud, p.longitud), zoom);
    return { x: q.x - origen.x, y: q.y - origen.y };
  };

  // 1. Mosaicos, en paralelo.
  const tareas: Promise<void>[] = [];
  for (let x = Math.floor(origen.x / TAM_MOSAICO); x <= Math.floor((origen.x + ANCHO_MAPA_PX) / TAM_MOSAICO); x++) {
    for (let y = Math.floor(origen.y / TAM_MOSAICO); y <= Math.floor((origen.y + ALTO_MAPA_PX) / TAM_MOSAICO); y++) {
      const dx = x * TAM_MOSAICO - origen.x;
      const dy = y * TAM_MOSAICO - origen.y;
      tareas.push(
        cargar(urlMosaico(x, y, zoom), senal).then(img => {
          if (img) {
            ctx.drawImage(img, dx, dy, TAM_MOSAICO, TAM_MOSAICO);
          } else {
            ctx.fillStyle = '#e5e5e5';
            ctx.fillRect(dx, dy, TAM_MOSAICO, TAM_MOSAICO);
          }
        }),
      );
    }
  }
  await Promise.race([Promise.all(tareas), esperarAborto(senal)]);
  if (senal?.aborted) throw new DOMException('Cancelado', 'AbortError');

  // 2. Polilínea.
  ctx.save();
  ctx.globalAlpha = 0.85;
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  dia.posiciones.forEach((p, i) => {
    const { x, y } = aPantalla(p);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.restore();

  const circulo = (x: number, y: number, radio: number, relleno: string) => {
    ctx.beginPath();
    ctx.arc(x, y, radio, 0, Math.PI * 2);
    ctx.fillStyle = relleno;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
  };

  // 3. Inicio y fin.
  if (dia.posiciones.length) {
    const ini = aPantalla(dia.posiciones[0]);
    const fin = aPantalla(dia.posiciones[dia.posiciones.length - 1]);
    circulo(ini.x, ini.y, 9, '#2ecc71');
    circulo(fin.x, fin.y, 9, '#e74c3c');
  }

  // 4. Paradas numeradas.
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  dia.paradas.forEach((pa, i) => {
    const { x, y } = aPantalla(pa);
    circulo(x, y, 13, color);
    ctx.fillStyle = '#fff';
    ctx.fillText(String(i + 1), x, y);
  });

  // 5. Atribución.
  const texto = '© colaboradores de OpenStreetMap';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const w = ctx.measureText(texto).width + 12;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(ANCHO_MAPA_PX - w, ALTO_MAPA_PX - 22, w, 22);
  ctx.fillStyle = '#333';
  ctx.fillText(texto, ANCHO_MAPA_PX - w + 6, ALTO_MAPA_PX - 7);

  // 6. Exportar.
  return canvas.toDataURL('image/jpeg', 0.8);
}

import * as L from 'leaflet';
import { HistorialPosicionDTO, ParadaVendedorDTO } from '../models/model';
import { DiaReporte } from './datos-reporte';
import {
  ALTO_MAPA_PX, ANCHO_MAPA_PX, CargadorMosaico, calcularEncuadre, renderizarMapaDia, ZOOM_MAXIMO_REPORTE,
} from './mapa-estatico';

function pos(latitud: number, longitud: number, i = 0): HistorialPosicionDTO {
  return {
    id: i, vendedorId: 'V1', vendedorCodigo: '1', vendedorNombre: 'Vendedor',
    fechaHora: `2026-11-05T08:${String(i).padStart(2, '0')}:00`, latitud, longitud,
  };
}

function parada(latitud: number, longitud: number, i: number): ParadaVendedorDTO {
  return {
    id: i, vendedorId: 'V1', vendedorCodigo: '1', vendedorNombre: 'Vendedor', latitud, longitud,
    calle: null, horaInicio: `2026-11-05T09:${String(i).padStart(2, '0')}:00`, horaFin: null, enCurso: false,
  };
}

describe('mapa-estatico', () => {
  it('calcularEncuadre con un solo punto devuelve zoomMaximo y centra el punto', () => {
    const e = calcularEncuadre([{ latitud: -41.47, longitud: -72.94 }], 1600, 1000, 60, 16);
    expect(e.zoom).toBe(16);
    const p = L.CRS.EPSG3857.latLngToPoint(L.latLng(-41.47, -72.94), e.zoom);
    expect(Math.abs(p.x - e.origen.x - 800)).toBeLessThan(1);
    expect(Math.abs(p.y - e.origen.y - 500)).toBeLessThan(1);
  });

  it('calcularEncuadre de un recorrido de ~10 km devuelve un zoom menor al máximo y todos los puntos dentro del margen', () => {
    const puntos = [
      { latitud: -41.47, longitud: -72.94 },
      { latitud: -41.38, longitud: -72.94 },
      { latitud: -41.42, longitud: -72.88 },
    ];
    const margen = 60;
    const e = calcularEncuadre(puntos, 1600, 1000, margen, 16);
    expect(e.zoom).toBeLessThan(16);
    for (const q of puntos) {
      const p = L.CRS.EPSG3857.latLngToPoint(L.latLng(q.latitud, q.longitud), e.zoom);
      const x = p.x - e.origen.x;
      const y = p.y - e.origen.y;
      expect(x).toBeGreaterThanOrEqual(margen - 1);
      expect(x).toBeLessThanOrEqual(1600 - margen + 1);
      expect(y).toBeGreaterThanOrEqual(margen - 1);
      expect(y).toBeLessThanOrEqual(1000 - margen + 1);
    }
  });

  const dia: DiaReporte = {
    fecha: '2026-11-05',
    posiciones: [pos(-41.47, -72.94, 0), pos(-41.45, -72.92, 1), pos(-41.43, -72.9, 2)],
    paradas: [parada(-41.45, -72.92, 0), parada(-41.43, -72.9, 1)],
  };

  it('renderizarMapaDia dibuja aunque un mosaico falle', async () => {
    const urls: string[] = [];
    const mosaico = document.createElement('canvas');
    mosaico.width = 1;
    mosaico.height = 1;
    const cargador: CargadorMosaico = async url => {
      urls.push(url);
      return urls.length === 1 ? null : mosaico;
    };
    const dataUrl = await renderizarMapaDia(dia, '#3366cc', cargador);
    expect(dataUrl.startsWith('data:image/jpeg')).toBeTrue();
    expect(urls.length).toBeGreaterThanOrEqual(1);
    expect(urls.length).toBe(new Set(urls).size);
  });

  it('renderizarMapaDia pide mosaicos con el zoom del encuadre', async () => {
    const e = calcularEncuadre(dia.posiciones, ANCHO_MAPA_PX, ALTO_MAPA_PX, 60, ZOOM_MAXIMO_REPORTE);
    const urls: string[] = [];
    const cargador: CargadorMosaico = async url => { urls.push(url); return null; };
    await renderizarMapaDia(dia, '#3366cc', cargador);
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) {
      expect(u).toContain(`/${e.zoom}/`);
      expect(u).toMatch(/^https:\/\/[abc]\.tile\.openstreetmap\.org\//);
    }
  });
});

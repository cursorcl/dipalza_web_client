import * as L from 'leaflet';
import { HistorialPosicionDTO } from './models/model';

export interface NodoParada {
  numero: number;
  latitud: number;
  longitud: number;
  comienzo: string;
  fin: string;
  esInicio: boolean;
  esFin: boolean;
  esParada: boolean;
}

export function detectarParadas(
  puntos: HistorialPosicionDTO[],
  radioMetros = 100,
  duracionMinimaMs = 10 * 60 * 1000
): NodoParada[] {
  if (puntos.length === 0) {
    return [];
  }

  if (puntos.length === 1) {
    const p = puntos[0];
    return [{
      numero: 1,
      latitud: p.latitud,
      longitud: p.longitud,
      comienzo: p.fechaHora,
      fin: p.fechaHora,
      esInicio: true,
      esFin: true,
      esParada: true
    }];
  }

  const grupos: HistorialPosicionDTO[][] = [[puntos[0]]];
  for (let i = 1; i < puntos.length; i++) {
    const punto = puntos[i];
    const grupoActual = grupos[grupos.length - 1];
    const referencia = grupoActual[0];
    const distancia = L.latLng(referencia.latitud, referencia.longitud)
      .distanceTo(L.latLng(punto.latitud, punto.longitud));

    if (distancia <= radioMetros) {
      grupoActual.push(punto);
    } else {
      grupos.push([punto]);
    }
  }

  const nodosSinNumero: Omit<NodoParada, 'numero'>[] = [];

  grupos.forEach((grupo, indice) => {
    const primero = grupo[0];
    const ultimo = grupo[grupo.length - 1];
    const duracionMs = new Date(ultimo.fechaHora).getTime() - new Date(primero.fechaHora).getTime();
    const esPrimerGrupo = indice === 0;
    const esUltimoGrupo = indice === grupos.length - 1;

    if (duracionMs >= duracionMinimaMs) {
      const latitud = grupo.reduce((suma, p) => suma + p.latitud, 0) / grupo.length;
      const longitud = grupo.reduce((suma, p) => suma + p.longitud, 0) / grupo.length;
      nodosSinNumero.push({
        latitud,
        longitud,
        comienzo: primero.fechaHora,
        fin: ultimo.fechaHora,
        esInicio: esPrimerGrupo,
        esFin: esUltimoGrupo,
        esParada: true
      });
      return;
    }

    if (esPrimerGrupo) {
      nodosSinNumero.push({
        latitud: primero.latitud,
        longitud: primero.longitud,
        comienzo: primero.fechaHora,
        fin: primero.fechaHora,
        esInicio: true,
        esFin: false,
        esParada: false
      });
    }
    if (esUltimoGrupo) {
      nodosSinNumero.push({
        latitud: ultimo.latitud,
        longitud: ultimo.longitud,
        comienzo: ultimo.fechaHora,
        fin: ultimo.fechaHora,
        esInicio: false,
        esFin: true,
        esParada: false
      });
    }
  });

  return nodosSinNumero.map((nodo, indice) => ({ ...nodo, numero: indice + 1 }));
}

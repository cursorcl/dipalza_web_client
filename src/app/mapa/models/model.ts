export interface PosicionDTO {
    vendedorId: string;
    vendedorCodigo: string;
    vendedorNombre: string;
    fechaHora: string;
    latitud: number;
    longitud: number;
}

export interface HistorialPosicionDTO {
    id: number;
    vendedorId: string;
    vendedorCodigo: string;
    vendedorNombre: string;
    fechaHora: string;
    latitud: number;
    longitud: number;
}

export interface VendedorId {
  codigo: string;
  tipo: string;
}
export interface PositionFilter {
    vendedorIds?: VendedorId[];      // List<String>
    desde?: Date | string;       // LocalDateTime
    hasta?: Date | string;       // LocalDateTime
    dia?: Date | string;         // LocalDate
}

export interface VendedorListItem {
  vendedorId: string;
  vendedorCodigo: string;
  vendedorNombre: string;
  color: string;
  fechaHora: string;
  tiempoRelativo: string;
  online: boolean;
}

export interface VendedorDTO {
  codigo: string;
  tipo: string;
  nombre: string;
}

export interface HistorialResumenDiaDTO {
  dia: string;
  cantidadPuntos: number;
  horaInicio: string;
  horaFin: string;
}

export interface ParadaVendedorDTO {
  id: number;
  vendedorId: string;
  vendedorCodigo: string;
  vendedorNombre: string;
  latitud: number;
  longitud: number;
  calle: string | null;
  horaInicio: string;
  horaFin: string | null;
  enCurso: boolean;
}

/** Venta finalizada de un vendedor en un día (vista Ventas del mapa). */
export interface VentaPosicionDTO {
    numero: number;
    ventaId: number;
    nombreCliente: string;
    inicioHora: string | null;
    finHora: string;
    finLat: number | null;
    finLon: number | null;
    tiempoTotalMinutos: number | null;
    reaperturas: number;
    total: number;
}

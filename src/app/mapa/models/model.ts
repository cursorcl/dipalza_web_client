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
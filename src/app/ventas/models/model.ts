export interface Venta {
    id: number;
    fecha: string;
    rutCliente: string;
    codigoCliente: string;
    nombreCliente: string;
    codigoVendedor: string;
    nombreVendedor: string;
    codigoRuta: string;
    nombreRuta: string;
    codigoCondicionVenta: string;
    nombreCondicionVenta: string;
    totalDescuento: number;
    totalIla: number;
    totalIva: number;
    totalNeto: number;
    total: number;
    estadoVenta: string;
    detalles: VentaDetalle[];
}
export interface VentaDetalle {
    id: number;
    ventaId: number;
    idProducto: number;
    nombreProducto: string;
    cantidad: number;
    precioUnitario: number;
    porcentajeDescuento: number;
    porcentajeIva: number;
    porcentajeIla: number;
    totalDescuento: number;
    totalIla: number;
    totalIva: number;
    totalLinea: number;
    unidad: string;
    piezas: number;
    piezasDetalle: VentaDetallePieza[];
}



export interface VentaDetallePieza {
    id: number;
    peso: number;
    detalleVentaId: number;
    inventarioId: number;
    numero: number;
    creadoEn: string;
}

export interface NumeracionResultado {
    cantidadPiezasAsignadas: number,
    cantidadPiezasFaltantes: number,
    numerosPiezasAsignadas: string[],
    pesoRealDeVenta: number
}
export interface VentaItemResultado {
    codigoProducto: string,
    nroLinea: number,
    precioVentaNeto: number,
    valorTotalVentaNeta: number,
    cantidadAsignada: number,
    cantidadFaltante: number,
    valorTotalIva: number,
    valorTotalIla: number,
    valorTotalDescuento: number,
    numeracion: NumeracionResultado,
    error: string
}

export interface VentaFacturaResultado {
    factura: string,
    fecha: Date,
    total: number,
    items: VentaItemResultado[],
    mensaje: string
}


export interface Numerado {
    id: number;
    codigoProducto: string;
    nombreProducto: string;
    numero: number;
    peso: number;
    estado: string;
    creadoEn: string;
    actualizadoEn: string;
}

export interface NumeradoPayload {
    id?: number;
    codigoProducto: string;
    numero: number;
    peso: number;
    estado?: string;
}

export interface NumeradoResumen {
    codigoProducto: string;
    nombreProducto: string;
    peso: number;
    piezas: number;
}


export interface Producto {
    articulo: string;
    descripcion: string;
    ventaNeto: number;
    porcIla: number;
    porcCarne: number;
    unidad: string;
    stock: number;
    numbered: Boolean;
    codigoila: string;
    lastUpdate: string;
    pieces: number;
    stockVentas: number;
    piezasVentas: number;
    costo: number;
    numerados?: Numerado[];
}

export interface ProductoElegibleNumerado {
    codigoProducto: string;
    nombreProducto: string;
    stock: number;
    piezas: number;
    tieneRegistrosAsociados: boolean;
}

export interface FacturacionResponse {
    resultados: VentaFacturaResultado[];
    loteId: number | null;
}

export interface PageResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    number: number;
    size: number;
}

export interface LoteFacturacionResumen {
    id: number;
    iniciadoEn: string;
    finalizadoEn: string | null;
    cantidadVentasProcesadas: number;
    cantidadVentasExitosas: number;
    cantidadVentasConError: number;
    auditoriaIncompleta: boolean;
    totalFacturado: number;
}

export interface ItemComparado {
    codigoProducto: string;
    nroLinea: number;
    precioVentaNetoEsperado: number;
    cantidadAsignadaEsperada: number;
    valorTotalVentaNetaEsperado: number;
    valorTotalIvaEsperado: number;
    valorTotalIlaEsperado: number;
    valorTotalDescuentoEsperado: number;
    error: string | null;
    precioVentaReal: number | null;
    totalLineaReal: number | null;
    precioCostoReal: number | null;
    numerosAsignados: string[];
}

export interface FacturaAuditoria {
    identificador: string;
    nroFactura: string;
    items: ItemComparado[];
}

export interface VentaAuditoria {
    ventaId: number;
    exitosa: boolean;
    mensaje: string;
    facturas: FacturaAuditoria[];
}

export interface StockProducto {
    articulo: string;
    stockAntes: number;
    stockDespues: number | null;
    totalFacturado: number;
}

export interface LoteFacturacionDetalle {
    id: number;
    iniciadoEn: string;
    finalizadoEn: string | null;
    auditoriaIncompleta: boolean;
    ventas: VentaAuditoria[];
    stock: StockProducto[];
}
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


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

// Una fila por factura: una venta facturada en más de una página de
// Mastersoft aparece como varias filas, cada una con los totales de solo
// esa página (no los de toda la venta).
export interface VentaFacturaResumen {
    ventaId: number;
    identificador: string;
    nroFactura: string;
    fecha: string;
    rutCliente: string;
    nombreCliente: string;
    codigoVendedor: string;
    nombreVendedor: string;
    nombreRuta: string;
    nombreCondicionVenta: string;
    totalDescuento: number;
    totalIla: number;
    totalIva: number;
    totalNeto: number;
    total: number;
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
    nroFactura: string | null;
    identificador: string | null;
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
    numeracion: NumeracionResultado | null,
    error: string | null,
    identificador: string | null,
    ventaDetalleId: number | null,
    stockAntes: number | null,
    stockDespues: number | null
}

export interface FacturaGenerada {
    identificador: string;
    nroFactura: string;
}

// Línea que no se pudo facturar por falta de stock (o de piezas numeradas disponibles).
export interface VentaItemFaltante {
    codigoProducto: string;
    nombreProducto: string;
    cantidadSolicitada: number;
    motivo: string;
}

export interface VentaFacturaResultado {
    factura: string,
    fecha: string,
    total: number,
    items: VentaItemResultado[] | null,
    mensaje: string,
    facturas: FacturaGenerada[],
    ventaId: number | null,
    codigoVendedor: string | null,
    tipoVendedor: string | null,
    nombreVendedor: string | null,
    rutCliente: string | null,
    codigoCliente: string | null,
    nombreCliente: string | null,
    faltantes: VentaItemFaltante[]
}

// Una factura real (página) generada en una corrida de facturación, con sus items.
export interface FacturaResultadoDTO {
    identificador: string;
    nroFactura: string;
    fecha: string;
    totalNeto: number;
    totalIva: number;
    totalIla: number;
    total: number;
    items: VentaItemResultado[];
}

// Facturas y faltantes de un cliente dentro de una corrida de facturación, fusionando
// todas las ventas de ese cliente procesadas en el mismo lote.
export interface ClienteResultadoDTO {
    rutCliente: string | null;
    codigoCliente: string | null;
    nombreCliente: string | null;
    facturas: FacturaResultadoDTO[];
    faltantes: VentaItemFaltante[];
}

// Clientes de un vendedor dentro de una corrida de facturación.
export interface VendedorResultadoDTO {
    codigoVendedor: string | null;
    tipoVendedor: string | null;
    nombreVendedor: string | null;
    clientes: ClienteResultadoDTO[];
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
    porVendedor: VendedorResultadoDTO[];
}

// Pantalla "Faltantes" (menú permanente, no efímera): productos sin facturar por falta de
// stock en una fecha puntual, agrupados por vendedor y cliente.
// Cada línea solo llena su propia dimensión (cantidad o piezas), nunca las dos a la vez --
// la que no aplica llega en null.
export interface ItemFaltanteDTO {
    ventaDetalleId: number;
    ventaId: number;
    codigoProducto: string;
    nombreProducto: string;
    cantidadSolicitada: number;
    cantidadAsignada: number | null;
    cantidadFaltante: number | null;
    piezasSolicitadas: number | null;
    piezasAsignadas: number | null;
    piezasFaltantes: number | null;
    motivo: string | null;
}

export interface ClienteFaltantesDTO {
    rutCliente: string | null;
    codigoCliente: string | null;
    nombreCliente: string | null;
    items: ItemFaltanteDTO[];
}

export interface VendedorFaltantesDTO {
    codigoVendedor: string | null;
    tipoVendedor: string | null;
    nombreVendedor: string | null;
    clientes: ClienteFaltantesDTO[];
}

export interface FaltantesPorFechaDTO {
    fecha: string | null;
    vendedores: VendedorFaltantesDTO[];
}

// Reporte "Hoja de Ruta": productos numerados vendidos (ventas ya facturadas) en una fecha,
// agrupados por ruta de reparto y producto, con los números de pieza de cada uno.
export interface ItemHojaRutaDTO {
    codigoProducto: string;
    nombreProducto: string;
    numerosPiezas: string;
    cantidad: number;
    totalLinea: number;
}

export interface RutaHojaRutaDTO {
    codigoRuta: string;
    nombreRuta: string;
    items: ItemHojaRutaDTO[];
    totalCantidad: number;
    totalLinea: number;
}

export interface HojaRutaDTO {
    fecha: string;
    rutas: RutaHojaRutaDTO[];
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
    cantidadReal: number | null;
    esNumerado: boolean;
    stockAntes: number | null;
    stockDespues: number | null;
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
    rutCliente: string;
    nombreCliente: string;
    codigoVendedor: string;
    nombreVendedor: string;
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
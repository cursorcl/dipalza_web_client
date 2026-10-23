import { Route } from '@angular/router';

export const VENTAS_ROUTES: Route[] = [
    {
        path: '',
        // Esta es la ruta por defecto cuando entren a /ventas
        loadComponent: () => import('./listado-ventas-dia/listado-ventas-dia.component').then((m) => m.ListadoVentasDiaComponent)
    },
    {
        path: 'detalle-venta',
        loadComponent: () => import('./listado-detalle-ventas-dia/listado-detalle-ventas-dia.component').then((m) => m.ListadoDetalleVentasDiaComponent)
    },
    {
        path: 'ventas-en-curso',
        loadComponent: () => import('./listado-ventas-dia-en-curso/listado-ventas-dia-en-curso.component').then((m) => m.ListadoVentasDiaEnCursoComponent)
    },
    {
        path: 'detalle-venta-en-curso',
        loadComponent: () => import('./listado-detalle-ventas-dia-en-curso/listado-detalle-ventas-dia-en-curso.component').then((m) => m.ListadoDetalleVentasDiaEnCursoComponent)
    },
    {
        path: 'ventas-facturadas',
        loadComponent: () => import('./listado-ventas-facturados-mes-actual/listado-ventas-facturados-mes-actual.component').then((m) => m.ListadoVentasFacturadosMesActualComponent)
    },
    {
        path: 'detalle-venta-facturada',
        loadComponent: () => import('./listado-detalle-ventas-facturados-mes-actual/listado-detalle-ventas-facturados-mes-actual.component').then((m) => m.ListadoDetalleVentasFacturadosMesActualComponent)
    },
    {
        path: 'resultados-facturacion',
        loadComponent: () => import('./listado-resultados-facturacion-dia/listado-resultados-facturacion-dia.component').then((m) => m.ListadoResultadosFacturacionDiaComponent)
    },
    {
        path: 'resultados-facturacion/facturas',
        loadComponent: () => import('./listado-facturas-resultados-facturacion/listado-facturas-resultados-facturacion.component').then((m) => m.ListadoFacturasResultadosFacturacionComponent)
    },
    {
        path: 'resultados-facturacion/items',
        loadComponent: () => import('./listado-items-resultados-facturacion/listado-items-resultados-facturacion.component').then((m) => m.ListadoItemsResultadosFacturacionComponent)
    },
    {
        path: 'resultados-facturacion/faltantes',
        loadComponent: () => import('./listado-faltantes-resultados-facturacion/listado-faltantes-resultados-facturacion.component').then((m) => m.ListadoFaltantesResultadosFacturacionComponent)
    },
    {
        path: 'faltantes',
        loadComponent: () => import('./listado-vendedores-faltantes/listado-vendedores-faltantes.component').then((m) => m.ListadoVendedoresFaltantesComponent)
    },
    {
        path: 'hoja-ruta',
        loadComponent: () => import('./listado-hoja-ruta/listado-hoja-ruta.component').then((m) => m.ListadoHojaRutaComponent)
    },
    {
        path: 'lotes-facturacion',
        loadComponent: () => import('./listado-lotes-facturacion/listado-lotes-facturacion.component').then((m) => m.ListadoLotesFacturacionComponent)
    },
    {
        path: 'lotes-facturacion/:id',
        loadComponent: () => import('./detalle-lote-facturacion/detalle-lote-facturacion.component').then((m) => m.DetalleLoteFacturacionComponent)
    }
];

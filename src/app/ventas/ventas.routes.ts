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
    }
];

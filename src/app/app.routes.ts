import { Route } from '@angular/router';
import { MainLayoutComponent } from './layout/app-layout/main-layout/main-layout.component';
import { AuthGuard } from './core/guard/auth.guard';
import { AuthLayoutComponent } from './layout/app-layout/auth-layout/auth-layout.component';
import { Page404Component } from './authentication/page404/page404.component';

export const APP_ROUTE: Route[] = [
    {
        path: '',
        component: MainLayoutComponent,
        canActivate: [AuthGuard],
        children: [
            { path: '', redirectTo: '/ventas', pathMatch: 'full' },
            {
                path: 'mapa',
                loadComponent: () =>
                    import('./mapa/mapa.component').then((m) => m.MapaComponent)
            },
            {
                path: 'ventas',
                loadComponent: () =>
                    import('./ventas/listado-ventas-dia/listado-ventas-dia.component').then((m) => m.ListadoVentasDiaComponent)
            },
            {
                path: 'detalle-venta',
                loadComponent: () =>
                    import('./ventas/listado-detalle-ventas-dia/listado-detalle-ventas-dia.component').then((m) => m.ListadoDetalleVentasDiaComponent)
            },
            {
                path: 'ventas-en-curso',
                loadComponent: () =>
                    import('./ventas/listado-ventas-dia-en-curso/listado-ventas-dia-en-curso.component').then((m) => m.ListadoVentasDiaEnCursoComponent)
            },
            {
                path: 'detalle-venta-en-curso',
                loadComponent: () =>
                    import('./ventas/listado-detalle-ventas-dia-en-curso/listado-detalle-ventas-dia-en-curso.component').then((m) => m.ListadoDetalleVentasDiaEnCursoComponent)
            },
            {
                path: 'ventas-facturadas',
                loadComponent: () =>
                    import('./ventas/listado-ventas-facturados-mes-actual/listado-ventas-facturados-mes-actual.component').then((m) => m.ListadoVentasFacturadosMesActualComponent)
            },
            {
                path: 'detalle-venta-facturada',
                loadComponent: () =>
                    import('./ventas/listado-detalle-ventas-facturados-mes-actual/listado-detalle-ventas-facturados-mes-actual.component').then((m) => m.ListadoDetalleVentasFacturadosMesActualComponent)
            },
            {
                path: 'resultados-facturacion',
                loadComponent: () =>
                    import('./ventas/listado-resultados-facturacion-dia/listado-resultados-facturacion-dia.component').then((m) => m.ListadoResultadosFacturacionDiaComponent)
            }
        ],
    },
    {
        path: 'authentication',
        component: AuthLayoutComponent,
        loadChildren: () =>
            import('./authentication/auth.routes').then((m) => m.AUTH_ROUTE),
    },
    { path: '**', component: Page404Component },
];

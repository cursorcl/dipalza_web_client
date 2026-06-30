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
                loadChildren: () =>
                    import('./ventas/ventas.routes').then((m) => m.VENTAS_ROUTES)
            },
            {
                path: 'numerados',
                loadChildren: () =>
                    import('./numerados/numerados.routes').then((m) => m.NUMERADOS_ROUTES)
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

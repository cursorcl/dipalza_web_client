import { Route } from '@angular/router';

export const NUMERADOS_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () => import('./listado-numerados/listado-numerados.component').then((m) => m.ListadoNumeradosComponent)
    },
    {
        path: 'detalle-numerado',
        loadComponent: () => import('./listado-numerados-de-un-producto/listado-numerados-de-un-producto.component').then((m) => m.ListadoNumeradosDeUnProductoComponent)
    }
];
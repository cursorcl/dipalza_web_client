import { Route } from '@angular/router';

export const USUARIOS_ROUTES: Route[] = [
    {
        path: '',
        loadComponent: () => import('./listado-usuarios/listado-usuarios.component').then((m) => m.ListadoUsuariosComponent)
    }
];

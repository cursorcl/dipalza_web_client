import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from 'environments/environment';

export interface Producto {
    codigo: string;
    descripcion: string;
}

@Injectable({
    providedIn: 'root'
})
export class ProductoService {

    private productos: Producto[] = [];

    constructor(private http: HttpClient) { }

    loadProductos(): Observable<Producto[]> {
        if (this.productos.length > 0) {
            return of(this.productos);
        }

        return this.http.get<Producto[]>(`${environment.apiUrl}/productos`).pipe(
            tap(data => this.productos = data)
        );
    }

    getProductos(): Producto[] {
        return this.productos;
    }

    refreshProductos(): Observable<Producto[]> {
        return this.http.get<Producto[]>('/api/productos').pipe(
            tap(data => this.productos = data)
        );
    }
}
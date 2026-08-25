import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

export interface ListaPrecio {
    codigo: string;
    nombre: string;
    rol: string | null;
}

@Injectable({
    providedIn: 'root'
})
export class ListaPrecioService {

    constructor(private http: HttpClient) { }

    getListasPrecio(): Observable<ListaPrecio[]> {
        return this.http.get<ListaPrecio[]>(`${environment.apiUrl}/listas-precio`);
    }
}

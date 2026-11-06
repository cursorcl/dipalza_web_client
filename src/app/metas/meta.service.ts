import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { TableroEquipo, TableroMeta } from './models/meta.models';

@Injectable({
  providedIn: 'root'
})
export class MetaService {

  private http = inject(HttpClient);

  tableroEquipo(): Observable<TableroEquipo> {
    return this.http.get<TableroEquipo>(`${environment.apiUrl}/admin/metas`);
  }

  tableroVendedor(codigo: string, tipo: string): Observable<TableroMeta> {
    return this.http.get<TableroMeta>(
      `${environment.apiUrl}/admin/metas/vendedor/${encodeURIComponent(codigo)}/${encodeURIComponent(tipo)}`
    );
  }
}

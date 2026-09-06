import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ConfiguracionService {
  constructor(private http: HttpClient) {}

  obtenerAuditoriaFacturacionHabilitada(): Observable<boolean> {
    return this.http
      .get<{ habilitada: boolean }>(`${environment.apiUrl}/configuracion/auditoria-facturacion-habilitada`)
      .pipe(map((response) => response.habilitada));
  }
}

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
import { ActualizarUsuarioPayload, CrearUsuarioPayload, CrearUsuarioResult, Usuario } from './models/model';

@Injectable({
  providedIn: 'root'
})
export class UsuariosService {
  private urlUsuarios = `${environment.apiUrl}/usuarios`;

  constructor(private httpClient: HttpClient) {}

  listar(): Observable<Usuario[]> {
    return this.httpClient.get<Usuario[]>(this.urlUsuarios);
  }

  obtener(id: number): Observable<Usuario> {
    return this.httpClient.get<Usuario>(`${this.urlUsuarios}/${id}`);
  }

  crear(payload: CrearUsuarioPayload): Observable<CrearUsuarioResult> {
    return this.httpClient.post<CrearUsuarioResult>(this.urlUsuarios, payload);
  }

  actualizar(id: number, payload: ActualizarUsuarioPayload): Observable<Usuario> {
    return this.httpClient.put<Usuario>(`${this.urlUsuarios}/${id}`, payload);
  }

  habilitar(id: number): Observable<Usuario> {
    return this.httpClient.patch<Usuario>(`${this.urlUsuarios}/${id}/habilitar`, {});
  }

  deshabilitar(id: number): Observable<Usuario> {
    return this.httpClient.patch<Usuario>(`${this.urlUsuarios}/${id}/deshabilitar`, {});
  }

  bloquear(id: number): Observable<Usuario> {
    return this.httpClient.patch<Usuario>(`${this.urlUsuarios}/${id}/bloquear`, {});
  }

  desbloquear(id: number): Observable<Usuario> {
    return this.httpClient.patch<Usuario>(`${this.urlUsuarios}/${id}/desbloquear`, {});
  }
}

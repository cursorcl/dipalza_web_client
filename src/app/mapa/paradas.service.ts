import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { ParadaVendedorDTO, PositionFilter } from './models/model';

@Injectable({
  providedIn: 'root'
})
export class ParadasService {
  private urlHistorico = `${environment.apiUrl}/deteccion/historico`;
  constructor(private httpClient: HttpClient) { }

  getHistorico(filter: PositionFilter): Observable<ParadaVendedorDTO[]> {
    return this.httpClient.post<ParadaVendedorDTO[]>(this.urlHistorico, filter);
  }
}

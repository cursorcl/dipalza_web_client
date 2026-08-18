import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { HistorialPosicionDTO, HistorialResumenDiaDTO, PosicionDTO, PositionFilter } from './models/model';

@Injectable({
  providedIn: 'root'
})
export class PositionsService {
  private urlObtenerPosiciones = `${environment.apiUrl}/posicion`;
  private urlHistorico = `${environment.apiUrl}/posicion/historico`;
  private urlResumenHistorico = `${environment.apiUrl}/posicion/historico/resumen`;
  constructor(private httpClient: HttpClient) { }


  getActualPositions() {
    return this.httpClient.get<PosicionDTO[]>(this.urlObtenerPosiciones);
  }

  private formatDate(date: Date | string): string {
    if (date instanceof Date) return date.toISOString();
    return date; // Si ya es string, asumimos que viene en formato correcto
  }
  getHistoric(filter: PositionFilter): Observable<HistorialPosicionDTO[]> {
    return this.httpClient.post<HistorialPosicionDTO[]>(`${this.urlHistorico}`, filter);
  }

  getResumenHistorico(vendedorCodigo: string, vendedorTipo: string): Observable<HistorialResumenDiaDTO[]> {
    const params = new HttpParams()
      .set('vendedorCodigo', vendedorCodigo)
      .set('vendedorTipo', vendedorTipo);
    return this.httpClient.get<HistorialResumenDiaDTO[]>(this.urlResumenHistorico, { params });
  }
}



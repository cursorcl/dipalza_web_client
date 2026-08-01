import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

export interface CalleResponse {
  calle: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodificacionService {
  private url = `${environment.apiUrl}/geocodificacion/inversa`;

  constructor(private httpClient: HttpClient) { }

  obtenerCalle(lat: number, lon: number): Observable<CalleResponse> {
    return this.httpClient.get<CalleResponse>(this.url, { params: { lat, lon } });
  }
}

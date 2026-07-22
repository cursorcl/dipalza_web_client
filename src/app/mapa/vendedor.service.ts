import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { VendedorDTO } from './models/model';

@Injectable({
  providedIn: 'root'
})
export class VendedorService {
  private urlVendedores = `${environment.apiUrl}/vendedores`;

  constructor(private httpClient: HttpClient) { }

  getVendedores(): Observable<VendedorDTO[]> {
    return this.httpClient.get<VendedorDTO[]>(this.urlVendedores);
  }
}

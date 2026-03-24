import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Venta, VentaDetalle } from './models/model';

@Injectable({
  providedIn: 'root'
})
export class VentasService {

  private urlVentaFecha = `${environment.apiUrl}/ventas/fecha?fecha=`;
  private urlVenta = `${environment.apiUrl}/ventas`;
  private urlVentaDetalle = `${environment.apiUrl}/ventadetalle`;
  private urlFacturar = `${environment.apiUrl}/facturacion`;
  constructor(private httpClient: HttpClient) { }



  // Método para obtener ventas por una fecha dada, la que debe venir en formato 'YYYY-MM-DD'
  obtainSalesByDate(date: string) {
    const url = `${this.urlVentaFecha}${date}`;
    return this.httpClient.get<Venta[]>(url);
  }

  // Método para obtener ventas con filtros dinámicos, los filtros se pasan como un objeto con claves y valores
  // Ejemplo de uso: obtainSales({ fecha: '2024-06-01', cliente: '12' })
  obtainSales(filtros: any) {
    let params = new HttpParams();
    Object.keys(filtros).forEach(key => {
      const valor = filtros[key];
      if (valor !== null && valor !== undefined) {
        if (Array.isArray(valor)) {
          // Importante: Para listas, se hace append por cada elemento
          valor.forEach(item => {
            params = params.append(key, item.toString());
          });
        } else {
          params = params.set(key, valor.toString());
        }
      }
    });
    return this.httpClient.get<Venta[]>(this.urlVenta, { params });
  }

  obtainDetailBySaleId(saleId: number) {
    const url = `${this.urlVentaDetalle}/${saleId}`;
    return this.httpClient.get<VentaDetalle[]>(url);
  }


  facture() {
    return this.httpClient.post(this.urlFacturar, {});
  }
}

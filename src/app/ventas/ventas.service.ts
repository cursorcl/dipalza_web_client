import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Numerado, NumeradoResumen, Venta, VentaDetalle, VentaFacturaResultado } from './models/model';
import { Observable } from 'rxjs';
import { FiltroVentas } from './models/other-models';

@Injectable({
  providedIn: 'root'
})
export class VentasService {

  private urlVentaFecha = `${environment.apiUrl}/ventas/fecha?fecha=`;
  private urlVenta = `${environment.apiUrl}/ventas`;
  private urlVentaDetalle = `${environment.apiUrl}/ventadetalle`;
  private urlFacturar = `${environment.apiUrl}/facturacion`;
  private urlNumeradosByProdcut = `${environment.apiUrl}/numerados/byProduct`;
  private urlNumeradosResumen = `${environment.apiUrl}/numerados/resumen`;
  constructor(private httpClient: HttpClient) { }



  // Método para obtener ventas por una fecha dada, la que debe venir en formato 'YYYY-MM-DD'
  obtainSalesByDate(date: string): Observable<Venta[]> {
    const url = `${this.urlVentaFecha}${date}`;
    return this.httpClient.get<Venta[]>(url);
  }

  // Método para obtener ventas con filtros dinámicos, los filtros se pasan como un objeto con claves y valores
  // Ejemplo de uso: obtainSales({ fecha: '2024-06-01', cliente: '12' })
  obtainSales(filtros: FiltroVentas): Observable<Venta[]> {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (Array.isArray(value) && value.length > 0) {
          // Importante: Para listas, se hace append por cada elemento
          value.forEach(item => {
            params = params.append(key, item.toString());
          });
        } else {
          params = params.set(key, value.toString());
        }
      }
    });
    return this.httpClient.get<Venta[]>(this.urlVenta, { params });
  }

  obtainDetailBySaleId(saleId: number): Observable<VentaDetalle[]> {
    const url = `${this.urlVentaDetalle}/${saleId}`;
    return this.httpClient.get<VentaDetalle[]>(url);
  }


  facture(): Observable<VentaFacturaResultado[]> {
    return this.httpClient.post<VentaFacturaResultado[]>(this.urlFacturar, {});
  }

  obtainNumerados(codigoProducto: string): Observable<Numerado[]> {
    const params = new HttpParams().set('codigoProducto', codigoProducto);
    const url = `${this.urlNumeradosByProdcut}`;
    return this.httpClient.get<Numerado[]>(url, { params });
  }

  obtainNumeradosResumen(): Observable<NumeradoResumen[]> {
    const url = `${this.urlNumeradosResumen}`;
    return this.httpClient.get<NumeradoResumen[]>(url);
  }
}

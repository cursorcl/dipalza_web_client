import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { VentasService } from '../ventas.service';
import { Venta } from '../models/model';

@Component({
  selector: 'app-resumen-ventas',
  imports: [CommonModule, RouterLink],
  templateUrl: './resumen-ventas.component.html',
  styleUrl: './resumen-ventas.component.scss'
})
export class ResumenVentasComponent implements OnInit {

  loadingIndicator = true;
  error = false;

  cantidadVentas = 0;
  totalNeto = 0;
  totalDescuento = 0;
  totalIva = 0;
  totalIla = 0;
  totalBruto = 0;

  private ventasService = inject(VentasService);

  ngOnInit(): void {
    this.cargarResumen();
  }

  cargarResumen(): void {
    this.loadingIndicator = true;
    this.error = false;
    this.ventasService.obtainSales({ estados: ['FINISHED'] }).subscribe({
      next: (ventas: Venta[]) => {
        this.calcularTotales(ventas);
        this.loadingIndicator = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al obtener el resumen de ventas:', error);
        this.error = true;
        this.loadingIndicator = false;
      }
    });
  }

  private calcularTotales(ventas: Venta[]): void {
    this.cantidadVentas = ventas.length;
    this.totalNeto = ventas.reduce((suma, venta) => suma + venta.totalNeto, 0);
    this.totalDescuento = ventas.reduce((suma, venta) => suma + venta.totalDescuento, 0);
    this.totalIva = ventas.reduce((suma, venta) => suma + venta.totalIva, 0);
    this.totalIla = ventas.reduce((suma, venta) => suma + venta.totalIla, 0);
    this.totalBruto = ventas.reduce((suma, venta) => suma + venta.total, 0);
  }
}

import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { HttpErrorResponse } from '@angular/common/http';
import { VentasService } from '../ventas.service';
import { FacturaFaltantesDTO } from '../models/model';

interface FilaFactura {
  nroFactura: string | null;
  facturaEstimada: boolean;
  ventaId: number;
  nombreCliente: string | null;
  nombreVendedor: string | null;
  cantidadItems: number;
  factura: FacturaFaltantesDTO;
}

interface ProductoAgregado {
  codigoProducto: string;
  nombreProducto: string;
  cantidadFaltanteTotal: number;
  piezasFaltanteTotal: number;
}

@Component({
  selector: 'app-listado-vendedores-faltantes',
  imports: [CommonModule, FormsModule, NgxDatatableModule, RouterLink],
  templateUrl: './listado-vendedores-faltantes.component.html',
  styleUrl: './listado-vendedores-faltantes.component.scss'
})
export class ListadoVendedoresFaltantesComponent implements OnInit {

  fecha: string | null = null;
  rows: FilaFactura[] = [];
  productosAgregados: ProductoAgregado[] = [];
  vista: 'factura' | 'producto' = 'factura';
  loadingIndicator = true;

  constructor(private ventaService: VentasService, private router: Router, private location: Location) {
  }

  ngOnInit(): void {
    // Sin fecha: el backend resuelve la última fecha real con faltantes.
    this.cargar(undefined);
  }

  private cargar(fecha: string | undefined) {
    this.loadingIndicator = true;
    this.ventaService.obtenerFaltantes(fecha).subscribe({
      next: (resultado) => {
        this.fecha = resultado.fecha;
        this.rows = resultado.facturas.map(f => ({
          nroFactura: f.nroFactura,
          facturaEstimada: f.items.some(i => i.facturaEstimada),
          ventaId: f.ventaId,
          nombreCliente: f.nombreCliente,
          nombreVendedor: f.nombreVendedor,
          cantidadItems: f.items.length,
          factura: f
        }));
        this.productosAgregados = this.calcularProductosAgregados(resultado.facturas);
        this.loadingIndicator = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al obtener los faltantes:', error);
        this.loadingIndicator = false;
      }
    });
  }

  private calcularProductosAgregados(facturas: FacturaFaltantesDTO[]): ProductoAgregado[] {
    const totales = new Map<string, ProductoAgregado>();
    for (const factura of facturas) {
      for (const item of factura.items) {
        const existente = totales.get(item.codigoProducto);
        if (existente) {
          existente.cantidadFaltanteTotal += item.cantidadFaltante ?? 0;
          existente.piezasFaltanteTotal += item.piezasFaltantes ?? 0;
        } else {
          totales.set(item.codigoProducto, {
            codigoProducto: item.codigoProducto,
            nombreProducto: item.nombreProducto,
            cantidadFaltanteTotal: item.cantidadFaltante ?? 0,
            piezasFaltanteTotal: item.piezasFaltantes ?? 0
          });
        }
      }
    }
    return Array.from(totales.values()).sort((a, b) => a.codigoProducto.localeCompare(b.codigoProducto));
  }

  onFechaChange() {
    if (this.fecha) {
      this.cargar(this.fecha);
    }
  }

  diaAnterior() {
    this.moverDia(-1);
  }

  diaSiguiente() {
    this.moverDia(1);
  }

  private moverDia(delta: number) {
    if (!this.fecha) return;
    const fecha = new Date(this.fecha + 'T00:00:00');
    fecha.setDate(fecha.getDate() + delta);
    this.fecha = fecha.toISOString().split('T')[0];
    this.cargar(this.fecha);
  }

  gotoDetalle(fila: FilaFactura) {
    this.router.navigate(['/ventas/faltantes/detalle'], {
      state: { facturaSeleccionada: fila.factura }
    });
  }

  goBack() {
    this.location.back();
  }
}

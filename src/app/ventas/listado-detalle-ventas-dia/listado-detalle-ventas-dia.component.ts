import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Venta, VentaDetalle } from '../models/model';
import { Router, RouterLink } from '@angular/router';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { VentasService } from '../ventas.service';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-listado-detalle-ventas-dia',
  imports: [CommonModule, NgxDatatableModule, RouterLink],
  templateUrl: './listado-detalle-ventas-dia.component.html',
  styleUrl: './listado-detalle-ventas-dia.component.scss'
})
export class ListadoDetalleVentasDiaComponent implements OnInit {

  venta: Venta | undefined;
  rows: VentaDetalle[] = [];
  temp: VentaDetalle[] = [];
  loadingIndicator = true;
  reorderable = true;
  scrollBarHorizontal = window.innerWidth < 1200;

  private ventaService = inject(VentasService);
  private router = inject(Router);
  private location = inject(Location);
  private destroyRef = inject(DestroyRef);

  constructor() {
    const navigation = this.router.getCurrentNavigation();

    if (navigation?.extras?.state) {
      this.venta = navigation.extras.state['ventaSeleccionada'] as Venta;
    } else {
      console.warn('No hay datos en el state, posiblemente recarga de página');
    }
    this.loadingIndicator = false;
  }

  updateFilter(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.toLowerCase();

    // filter our data
    this.rows = this.temp.filter(function (d: VentaDetalle) {
      return d.nombreProducto.toLowerCase().indexOf(val) !== -1 || !val;
    }) || [];
  }

  ngOnInit(): void {
    this.updateSalesByDate();
  }

  updateSalesByDate() {
    this.loadingIndicator = true;
    this.ventaService.obtainDetailBySaleId(this.venta?.id || 0)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ventas: VentaDetalle[]) => {
          this.rows = ventas;
          this.temp = ventas;
          this.loadingIndicator = false;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error al obtener las ventas:', error);
          this.loadingIndicator = false;
        }
      });
  }

  goBack() {
    this.location.back(); // Regresa a la página anterior en el historial
  }
}


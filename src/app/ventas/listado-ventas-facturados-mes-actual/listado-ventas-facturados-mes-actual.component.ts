import { Component, DestroyRef, HostListener, inject, OnInit, ViewChild } from '@angular/core';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { CommonModule } from '@angular/common';
import { VentasService } from '../ventas.service';
import { Venta } from '../models/model';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-listado-ventas-facturados-mes-actual',
  imports: [NgxDatatableModule, CommonModule, FormsModule, RouterLink],
  templateUrl: './listado-ventas-facturados-mes-actual.component.html',
  styleUrl: './listado-ventas-facturados-mes-actual.component.scss'
})
export class ListadoVentasFacturadosMesActualComponent implements OnInit {

  facturationDate: string = new Date().toISOString().split('T')[0]; // Formato 'YYYY-MM-DD'
  rows: Venta[] = [];
  temp: Venta[] = [];
  loadingIndicator = true;
  reorderable = true;
  scrollBarHorizontal = window.innerWidth < 1200;

  @ViewChild('table') table!: DatatableComponent;

  private ventaService = inject(VentasService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);



  ngOnInit(): void {
    this.updateSalesByDate();
  }

  updateSalesByDate() {
    this.loadingIndicator = true;
    const filtros = { estados: ['CLOSED'] };
    this.ventaService.obtainSales(filtros)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ventas: Venta[]) => {
          this.rows = ventas;
          this.temp = ventas;
          this.loadingIndicator = false;
        },
        error: (error: any) => {
          console.error('Error al obtener las ventas:', error);
          this.loadingIndicator = false;
        }
      });
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.scrollBarHorizontal = window.innerWidth < 1200;
    this.table.recalculate();
    this.table.recalculateColumns();
  }

  updateFilter(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.toLowerCase();

    // filter our data
    this.rows = this.temp.filter(function (d: Venta) {
      return d.rutCliente.toLowerCase().indexOf(val) !== -1
        || d.nombreCliente.toLowerCase().indexOf(val) !== -1
        || d.nombreCondicionVenta.toLowerCase().indexOf(val) !== -1
        || d.nombreVendedor.toLowerCase().indexOf(val) !== -1
        || d.totalNeto.toFixed(0).indexOf(val) !== -1
        || d.totalDescuento.toFixed(0).indexOf(val) !== -1
        || d.totalIla.toFixed(0).indexOf(val) !== -1
        || d.totalIva.toFixed(0).indexOf(val) !== -1
        || d.total.toFixed(0).indexOf(val) !== -1
        || !val;
    });

    // update the rows
    this.table.offset = 0;
  }

  gotoToDetail(row: Venta) {
    this.router.navigate(['/ventas/detalle-venta'], {
      state: { ventaSeleccionada: row }
    });
  }

}
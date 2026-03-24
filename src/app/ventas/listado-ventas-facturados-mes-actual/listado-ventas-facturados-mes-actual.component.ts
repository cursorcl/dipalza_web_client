import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { CommonModule } from '@angular/common';
import { VentasService } from '../ventas.service';
import { Venta } from '../models/model';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

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

  constructor(private ventaService: VentasService, private router: Router) {
  }
  ngOnInit(): void {
    this.updateSalesByDate();
  }

  updateSalesByDate() {
    this.loadingIndicator = true;
    const filtros = { estados: ['CLOSED'] };
    this.ventaService.obtainSales(filtros).subscribe({
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
  onResize(event: any) {
    this.scrollBarHorizontal = window.innerWidth < 1200;
    this.table.recalculate();
    this.table.recalculateColumns();
  }

  getRowHeight(row: any) {
    return row.height;
  }

  updateFilter(event: any) {
    const val = event.target.value.toLowerCase();

    // filter our data
    this.rows = this.temp.filter(function (d: any) {
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
    this.router.navigate(['/detalle-venta'], {
      state: { ventaSeleccionada: row }
    });
  }

}
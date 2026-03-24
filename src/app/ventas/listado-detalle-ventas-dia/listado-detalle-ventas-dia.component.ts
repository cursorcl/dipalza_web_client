import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Venta, VentaDetalle } from '../models/model';
import { Router, RouterLink } from '@angular/router';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { VentasService } from '../ventas.service';

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


  constructor(private ventaService: VentasService,private router: Router, private location: Location) {
    const navigation = this.router.getCurrentNavigation();

    if (navigation?.extras?.state) {
      this.venta = navigation.extras.state['ventaSeleccionada'] as Venta;
    } else {
      console.warn('No hay datos en el state, posiblemente recarga de página');
    }
    this.loadingIndicator = false;
  }

  updateFilter(event: any) {
    const val = event.target.value.toLowerCase();

    // filter our data
    const temp = this.rows.filter(function (d) {
      return d.nombreProducto.toLowerCase().indexOf(val) !== -1 || !val;
    }) || [];
  }

  numbersOfPieces(piezasDetalle: any[]): string {
    return piezasDetalle ? piezasDetalle.map( p => p.numero ).join(', ') : '';
  }

  ngOnInit(): void {
    this.updateSalesByDate();
  }

  updateSalesByDate() {
    this.loadingIndicator = true;
    const filtros = { estados: ['FINISHED'] };
    this.ventaService.obtainDetailBySaleId(this.venta?.id || 0).subscribe({
      next: (ventas: VentaDetalle[]) => {
        this.rows = ventas;
        this.loadingIndicator = false;
      },
      error: (error: any) => {
        console.error('Error al obtener las ventas:', error);
        this.loadingIndicator = false;
      }
    });
  }

  goBack() {
    this.location.back(); // Regresa a la página anterior en el historial
  }
}

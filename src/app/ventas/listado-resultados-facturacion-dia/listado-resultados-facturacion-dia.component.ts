import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Venta, VentaFacturaResultado } from '../models/model';
import { RouterLink } from '@angular/router';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { DataResultService } from '../models/data-results.service';

@Component({
  selector: 'app-listado-resultados-facturacion-dia',
  imports: [CommonModule, NgxDatatableModule, RouterLink],
  templateUrl: './listado-resultados-facturacion-dia.component.html',
  styleUrl: './listado-resultados-facturacion-dia.component.scss'
})
export class ListadoResultadosFacturacionDiaComponent implements OnInit {

  venta: Venta | undefined;
  rows: VentaFacturaResultado[] = [];
  temp: VentaFacturaResultado[] = [];
  loadingIndicator = true;
  reorderable = true;
  scrollBarHorizontal = window.innerWidth < 1200;


  @ViewChild(DatatableComponent) table!: DatatableComponent;

  private location = inject(Location);
  private dataResultService = inject(DataResultService);


  toggleExpandRow(row: VentaFacturaResultado) {
    this.table.rowDetail.toggleExpandRow(row);
  }

  updateFilter(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.toLowerCase();

    // filter our data
    this.rows = this.temp.filter(function (d: VentaFacturaResultado) {
      return d.factura.toLowerCase().indexOf(val) !== -1 || !val;
    }) || [];
  }

  ngOnInit(): void {
    this.rows = this.dataResultService.getResults();
    this.temp = this.rows;
    this.loadingIndicator = false;
  }


  getRowDetailHeight(row?: any, index?: number): number {
    if (!row || !row.items) return 50;
    // Ejemplo: 40px por cada ítem + 50px de encabezado de la sub-tabla
    return (row.items.length * 40) + 50;
  }
  goBack() {
    this.location.back(); // Regresa a la página anterior en el historial
  }
}

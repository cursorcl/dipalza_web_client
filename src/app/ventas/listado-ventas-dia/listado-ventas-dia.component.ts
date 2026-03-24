import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { CommonModule } from '@angular/common';
import { VentasService } from '../ventas.service';
import { Venta, VentaFacturaResultado } from '../models/model';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DataResultService } from '../models/data-results.service';

@Component({
  selector: 'app-listado-ventas-dia',
  imports: [NgxDatatableModule, CommonModule, FormsModule, RouterLink],
  templateUrl: './listado-ventas-dia.component.html',
  styleUrl: './listado-ventas-dia.component.scss'
})
export class ListadoVentasDiaComponent implements OnInit {

  facturationDate: string = new Date().toISOString().split('T')[0]; // Formato 'YYYY-MM-DD'
  rows: Venta[] = [];
  temp: Venta[] = [];

  results: VentaFacturaResultado[] = [];
  loadingIndicator = true;
  reorderable = true;
  scrollBarHorizontal = window.innerWidth < 1200;

  canFacture: boolean = false;

  @ViewChild('table') table!: DatatableComponent;

  constructor(private ventaService: VentasService, private router: Router, private dataResultService: DataResultService) {
  }
  ngOnInit(): void {
    this.updateSalesByDate();
  }

  updateSalesByDate() {
    this.loadingIndicator = true;
    const filtros = { estados: ['FINISHED'] };
    this.ventaService.obtainSales(filtros).subscribe({
      next: (ventas: Venta[]) => {
        this.rows = ventas;
        this.temp = ventas;
        this.canFacture = ventas.length > 0;
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
    const localTemp = this.temp.filter(function (d: any) {
      return d.name.toLowerCase().indexOf(val) !== -1 || !val;
    });

    // update the rows
    this.rows = localTemp;
    // Whenever the filter changes, always go back to the first page
    this.table.offset = 0;
  }

  gotoToDetail(row: Venta) {
    this.router.navigate(['/detalle-venta'], {
      state: { ventaSeleccionada: row }
    });
  }

  facture() {
    this.ventaService.facture().subscribe({
      next: (response: any) => {
        console.log('Facturación exitosa:', response);
        this.updateSalesByDate();
        this.dataResultService.setResults(response);
        this.router.navigate(['/resultados-facturacion']);
      },
      error: (error: any) => {
        console.error('Error al facturar:', error);
        alert('Error al facturar');
        this.updateSalesByDate();
      }
    });
  }
}
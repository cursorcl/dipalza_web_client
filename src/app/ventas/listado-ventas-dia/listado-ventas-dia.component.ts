import { Component, DestroyRef, HostListener, inject, OnInit, ViewChild } from '@angular/core';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { CommonModule } from '@angular/common';
import { VentasService } from '../ventas.service';
import { Venta, VentaFacturaResultado } from '../models/model';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DataResultService } from '../models/data-results.service';
import { HttpErrorResponse } from '@angular/common/http';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

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

  private ventaService = inject(VentasService);
  private router = inject(Router);
  private dataResultService = inject(DataResultService);
  private destroyRef = inject(DestroyRef);

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
      error: (error: HttpErrorResponse) => {
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

    this.rows = this.temp.filter(function (d: Venta) {
      return d.nombreCliente.toLowerCase().indexOf(val) !== -1 || !val;
    });
    this.table.offset = 0;
  }

  gotoToDetail(row: Venta) {
    this.router.navigate(['/ventas/detalle-venta'], {
      state: { ventaSeleccionada: row }
    });
  }

  facture() {
    this.ventaService.facture()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (response: VentaFacturaResultado[]) => {
          console.log('Facturación exitosa:', response);
          this.updateSalesByDate();
          this.dataResultService.setResults(response);
          this.router.navigate(['/ventas/resultados-facturacion']);
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error al facturar:', error);
          alert('Error al facturar');
          this.updateSalesByDate();
        }
      });
  }
}
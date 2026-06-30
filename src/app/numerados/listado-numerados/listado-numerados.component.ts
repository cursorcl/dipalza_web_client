import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Numerado, NumeradoResumen } from 'app/ventas/models/model';
import { VentasService } from 'app/ventas/ventas.service';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-listado-numerados',
  imports: [NgxDatatableModule, RouterLink],
  templateUrl: './listado-numerados.component.html',
  styleUrl: './listado-numerados.component.scss'
})
export class ListadoNumeradosComponent implements OnInit {


  loadingIndicator = true;
  reorderable = true;
  scrollBarHorizontal = window.innerWidth < 1200;

  rows: NumeradoResumen[] = [];
  temp: NumeradoResumen[] = [];

  private ventaService = inject(VentasService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);


  ngOnInit(): void {
    this.updateSalesByDate();
  }

  updateSalesByDate() {
    this.loadingIndicator = true;
    this.ventaService.obtainNumeradosResumen()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (numerados: NumeradoResumen[]) => {
          this.rows = numerados;
          this.temp = numerados;
          this.loadingIndicator = false;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error al obtener las ventas:', error);
          this.loadingIndicator = false;
        }
      });
  }

  updateFilter(event: Event) {
    const input = event.target as HTMLInputElement;
    const val = input.value.toLowerCase();

    // filter our data
    this.rows = this.temp.filter(function (d: NumeradoResumen) {
      return d.nombreProducto.toLowerCase().indexOf(val) !== -1 || !val;
    }) || [];
  }

  gotoToDetail(row: NumeradoResumen) {
    console.log(row);
    this.router.navigate(['/numerados/detalle-numerado'], {
      state: { numeradoResumenSeleccionado: row }
    });
  }

  addNumerado() {
    //this.router.navigate(['/numerados/agregar-numerado']);
  }
  updateNumerado(row: NumeradoResumen) {
    console.log(row);
    this.router.navigate(['/numerados/detalle-numerado'], {
      state: { numeradoResumenSeleccionado: row }
    });
  }
  deleteNumerado(row: NumeradoResumen) {
    console.log(row);
    this.router.navigate(['/numerados/detalle-numerado'], {
      state: { numeradoResumenSeleccionado: row }
    });
  }
}

import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Numerado, NumeradoResumen } from 'app/ventas/models/model';
import { VentasService } from 'app/ventas/ventas.service';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { Router, RouterLink } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EdicionNumeradosComponent } from '../edicion-numerados/edicion-numerados.component';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-listado-numerados-de-un-producto',
  imports: [NgxDatatableModule, RouterLink],
  templateUrl: './listado-numerados-de-un-producto.component.html',
  styleUrl: './listado-numerados-de-un-producto.component.scss'
})
export class ListadoNumeradosDeUnProductoComponent {


  loadingIndicator = true;
  reorderable = true;
  scrollBarHorizontal = window.innerWidth < 1200;
  error = '';

  numeradoResumenSeleccionado?: NumeradoResumen;
  rows: Numerado[] = [];
  temp: Numerado[] = [];

  private ventaService = inject(VentasService);
  private destroyRef = inject(DestroyRef);
  private router = inject(Router);
  private modalService = inject(NgbModal);

  constructor() {
    const navigation = this.router.getCurrentNavigation();

    if (navigation?.extras?.state) {
      this.numeradoResumenSeleccionado = navigation.extras.state['numeradoResumenSeleccionado'] as NumeradoResumen;
      this.updateSalesByDate(this.numeradoResumenSeleccionado?.codigoProducto);
    } else {
      console.warn('No hay datos en el state, posiblemente recarga de página');
    }
  }


  updateSalesByDate(codigoProducto: string) {
    this.loadingIndicator = true;
    this.ventaService.obtainNumerados(codigoProducto)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (numerados: Numerado[]) => {
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
    this.rows = this.temp.filter(function (d: Numerado) {
      return d.nombreProducto.toLowerCase().indexOf(val) !== -1 || !val;
    }) || [];
  }

  agregarNumerado() {
    const modalRef = this.modalService.open(EdicionNumeradosComponent);
    modalRef.componentInstance.codigoProductoPreseleccionado = this.numeradoResumenSeleccionado?.codigoProducto;
    modalRef.closed.subscribe(() => this.updateSalesByDate(this.numeradoResumenSeleccionado?.codigoProducto ?? ''));
  }

  eliminarNumerado(row: Numerado) {
    Swal.fire({
      title: 'Eliminar numerado',
      text: `¿Eliminar el numerado ${row.numero} de ${row.nombreProducto} (${row.peso} kg)?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí',
      cancelButtonText: 'No',
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (!result.isConfirmed) {
        return;
      }
      this.error = '';
      this.ventaService.eliminarNumerado(row.id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => this.updateSalesByDate(this.numeradoResumenSeleccionado?.codigoProducto ?? ''),
          error: (error: HttpErrorResponse) => {
            console.error('Error al eliminar numerado:', error);
            this.error = error.error?.message ?? 'No se pudo eliminar el numerado. Intente nuevamente.';
          }
        });
    });
  }

}

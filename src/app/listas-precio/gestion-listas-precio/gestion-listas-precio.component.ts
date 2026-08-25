import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { Observable } from 'rxjs';
import Swal from 'sweetalert2';
import { ListaPrecio, ListaPrecioService } from '../../services/lista-precio.service';

@Component({
  selector: 'app-gestion-listas-precio',
  imports: [NgxDatatableModule],
  templateUrl: './gestion-listas-precio.component.html',
  styleUrl: './gestion-listas-precio.component.scss'
})
export class GestionListasPrecioComponent implements OnInit {
  rows: ListaPrecio[] = [];
  loading = false;
  error = '';
  reorderable = true;
  scrollBarHorizontal = window.innerWidth < 1200;

  constructor(public activeModal: NgbActiveModal, private listaPrecioService: ListaPrecioService) {}

  ngOnInit(): void {
    this.cargarListas();
  }

  marcarComoPrincipal(row: ListaPrecio): void {
    this.confirmarYEjecutar(
      `¿Marcar "${row.nombre || row.codigo}" (${row.codigo}) como lista Principal? El precio de todos los productos se recotiza de inmediato.`,
      () => this.listaPrecioService.marcarComoPrincipal(row.codigo),
      'No se pudo marcar la lista como Principal.'
    );
  }

  marcarComoSecundaria(row: ListaPrecio): void {
    this.confirmarYEjecutar(
      `¿Marcar "${row.nombre || row.codigo}" (${row.codigo}) como lista Secundaria? El segundo precio de todos los productos se recotiza de inmediato.`,
      () => this.listaPrecioService.marcarComoSecundaria(row.codigo),
      'No se pudo marcar la lista como Secundaria.'
    );
  }

  quitarSecundaria(row: ListaPrecio): void {
    this.confirmarYEjecutar(
      `¿Quitar "${row.nombre || row.codigo}" (${row.codigo}) como lista Secundaria? Dejará de mostrarse un segundo precio.`,
      () => this.listaPrecioService.quitarSecundaria(),
      'No se pudo quitar la lista Secundaria.'
    );
  }

  private confirmarYEjecutar(mensaje: string, accion: () => Observable<void>, mensajeErrorPorDefecto: string): void {
    Swal.fire({
      title: 'Confirmar cambio',
      text: mensaje,
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
      accion().subscribe({
        next: () => this.cargarListas(),
        error: (err: HttpErrorResponse) => {
          this.error = err.status === 400 && err.error?.message
            ? err.error.message
            : mensajeErrorPorDefecto;
        }
      });
    });
  }

  private cargarListas(): void {
    this.loading = true;
    this.listaPrecioService.getListasPrecio().subscribe({
      next: (listas) => {
        this.rows = listas;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar el catálogo de listas de precio.';
        this.loading = false;
      }
    });
  }
}

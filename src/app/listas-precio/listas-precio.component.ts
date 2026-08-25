import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { RouterLink } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ListaPrecio, ListaPrecioService } from '../services/lista-precio.service';
import { GestionListasPrecioComponent } from './gestion-listas-precio/gestion-listas-precio.component';

@Component({
  selector: 'app-listas-precio',
  imports: [NgxDatatableModule, RouterLink],
  templateUrl: './listas-precio.component.html',
  styleUrl: './listas-precio.component.scss'
})
export class ListasPrecioComponent implements OnInit {

  rows: ListaPrecio[] = [];
  loadingIndicator = true;
  scrollBarHorizontal = window.innerWidth < 1200;

  private listaPrecioService = inject(ListaPrecioService);
  private destroyRef = inject(DestroyRef);
  private modalService = inject(NgbModal);

  ngOnInit(): void {
    this.cargarListas();
  }

  cargarListas(): void {
    this.loadingIndicator = true;
    this.listaPrecioService.getListasPrecio()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (listas: ListaPrecio[]) => {
          this.rows = listas;
          this.loadingIndicator = false;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error al obtener las listas de precio:', error);
          this.loadingIndicator = false;
        }
      });
  }

  gestionar(): void {
    const modalRef = this.modalService.open(GestionListasPrecioComponent, { size: 'lg', scrollable: true });
    modalRef.closed.subscribe(() => this.cargarListas());
  }

  etiquetaRol(rol: string | null): string {
    if (rol === 'P') return 'Principal';
    if (rol === 'S') return 'Secundaria';
    return 'Inactiva';
  }
}

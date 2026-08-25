import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { RouterLink } from '@angular/router';
import { ListaPrecio, ListaPrecioService } from '../services/lista-precio.service';

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

  etiquetaRol(rol: string | null): string {
    if (rol === 'P') return 'Principal';
    if (rol === 'S') return 'Secundaria';
    return 'Inactiva';
  }
}

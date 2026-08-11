import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { NgbActiveModal, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { Observable, OperatorFunction, debounceTime, distinctUntilChanged, map } from 'rxjs';
import Swal from 'sweetalert2';
import { Producto, ProductoElegibleNumerado } from 'app/ventas/models/model';
import { VentasService } from 'app/ventas/ventas.service';

@Component({
  selector: 'app-gestion-productos-numerados',
  imports: [ReactiveFormsModule, NgbTypeahead],
  templateUrl: './gestion-productos-numerados.component.html',
  styleUrl: './gestion-productos-numerados.component.scss'
})
export class GestionProductosNumeradosComponent implements OnInit {
  rows: ProductoElegibleNumerado[] = [];
  productosDisponibles: Producto[] = [];
  productoSeleccionado: Producto | null = null;
  buscadorControl = new FormControl<string | Producto | null>('');

  loading = false;
  agregando = false;
  error = '';

  constructor(public activeModal: NgbActiveModal, private ventasService: VentasService) {}

  ngOnInit(): void {
    this.cargarProductosElegibles();
    this.cargarProductosDisponibles();
    this.buscadorControl.valueChanges.subscribe(v => {
      if (v !== this.productoSeleccionado) {
        this.productoSeleccionado = null;
      }
    });
  }

  buscarProducto: OperatorFunction<string, readonly Producto[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => {
        const t = term.toLowerCase().trim();
        if (t.length < 2) {
          return [];
        }
        return this.productosDisponibles
          .filter(p => p.articulo.toLowerCase().includes(t) || p.descripcion.toLowerCase().includes(t))
          .slice(0, 10);
      })
    );

  formatearProducto = (p: Producto): string => p ? `${p.articulo} - ${p.descripcion}` : '';

  seleccionarProducto(event: NgbTypeaheadSelectItemEvent<Producto>): void {
    this.productoSeleccionado = event.item;
  }

  agregarProducto(): void {
    if (!this.productoSeleccionado) {
      return;
    }
    this.error = '';
    this.agregando = true;
    const articulo = this.productoSeleccionado.articulo;
    this.ventasService.agregarProductoElegibleNumerado(articulo).subscribe({
      next: () => {
        this.agregando = false;
        this.productoSeleccionado = null;
        this.buscadorControl.setValue('');
        this.cargarProductosElegibles();
        this.cargarProductosDisponibles();
      },
      error: (err: HttpErrorResponse) => {
        this.agregando = false;
        this.error = err.status === 400 && err.error?.message
          ? err.error.message
          : 'No se pudo agregar el producto a la lista de numerados.';
      }
    });
  }

  quitarProducto(row: ProductoElegibleNumerado): void {
    if (row.tieneRegistrosAsociados) {
      return;
    }
    Swal.fire({
      title: 'Quitar producto numerado',
      text: `¿Quitar ${row.nombreProducto} (${row.codigoProducto}) de la lista de productos numerados?`,
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
      this.ventasService.quitarProductoElegibleNumerado(row.codigoProducto).subscribe({
        next: () => {
          this.cargarProductosElegibles();
          this.cargarProductosDisponibles();
        },
        error: (err: HttpErrorResponse) => {
          this.error = err.status === 400 && err.error?.message
            ? err.error.message
            : 'No se pudo quitar el producto de la lista de numerados.';
        }
      });
    });
  }

  private cargarProductosElegibles(): void {
    this.loading = true;
    this.ventasService.obtainProductosElegiblesNumerado().subscribe({
      next: (rows) => {
        this.rows = rows;
        this.loading = false;
      },
      error: () => {
        this.error = 'No se pudo cargar la lista de productos numerados.';
        this.loading = false;
      }
    });
  }

  private cargarProductosDisponibles(): void {
    this.ventasService.obtainProductos().subscribe({
      next: (productos) => {
        this.productosDisponibles = productos.filter(p => p.numbered !== true);
      },
      error: () => {
        this.error = 'No se pudo cargar el catálogo de productos.';
      }
    });
  }
}

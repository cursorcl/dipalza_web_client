import { HttpErrorResponse } from '@angular/common/http';
import { formatDate } from '@angular/common';
import { Component, DestroyRef, inject, LOCALE_ID, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MetaService } from './meta.service';
import { MetaVendedorFila, TableroEquipo } from './models/meta.models';
import { anchoBarraAvance, formatearAvance, formatearPesos, tieneMeta } from './formato-metas';

@Component({
  selector: 'app-metas',
  imports: [RouterLink],
  templateUrl: './metas.component.html',
  styleUrl: './metas.component.scss'
})
export class MetasComponent implements OnInit {

  tablero: TableroEquipo | null = null;
  cargando = true;
  error: string | null = null;
  // Se completa en la Task 3 (selección de vendedor para los gráficos).
  seleccionado: MetaVendedorFila | null = null;

  readonly formatearPesos = formatearPesos;
  readonly formatearAvance = formatearAvance;
  readonly anchoBarraAvance = anchoBarraAvance;
  readonly tieneMeta = tieneMeta;

  private metaService = inject(MetaService);
  private destroyRef = inject(DestroyRef);
  private locale = inject(LOCALE_ID);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;
    this.metaService.tableroEquipo()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tablero: TableroEquipo) => {
          this.tablero = tablero;
          this.cargando = false;
        },
        error: (error: HttpErrorResponse) => {
          console.error('Error al obtener las metas:', error);
          this.error = 'No se pudieron cargar las metas.';
          this.cargando = false;
        }
      });
  }

  /** "2026-11" -> "noviembre 2026". */
  get periodoTexto(): string {
    if (!this.tablero) {
      return '';
    }
    const [anio, mes] = this.tablero.equipo.periodo.split('-').map(Number);
    return formatDate(new Date(anio, mes - 1, 1), 'LLLL y', this.locale);
  }

  get actualizadoA(): string {
    return this.tablero ? formatDate(this.tablero.equipo.calculadoEn, 'HH:mm', this.locale) : '';
  }
}

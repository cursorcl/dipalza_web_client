import { HttpErrorResponse } from '@angular/common/http';
import { formatDate } from '@angular/common';
import { afterNextRender, Component, DestroyRef, Injector, inject, LOCALE_ID, OnInit } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { NgxDatatableModule, SelectionType } from '@swimlane/ngx-datatable';
import { catchError, EMPTY, interval, map, of, Subject, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { MetaService } from './meta.service';
import { MetaVendedorFila, TableroEquipo, TableroMeta } from './models/meta.models';
import { graficoDiario, graficoMensual } from './graficos-metas';
import { anchoBarraAvance, formatearAvance, formatearPesos, tieneMeta } from './formato-metas';

const REFRESCO_MS = 300_000;

@Component({
  selector: 'app-metas',
  imports: [RouterLink, BaseChartDirective, NgxDatatableModule],
  templateUrl: './metas.component.html',
  styleUrl: './metas.component.scss'
})
export class MetasComponent implements OnInit {

  tablero: TableroEquipo | null = null;
  cargando = true;
  error: string | null = null;
  seleccionado: MetaVendedorFila | null = null;
  /** Selección que se le pasa a la tabla (arreglo estable, no se recrea en cada ciclo). */
  filasSeleccionadas: MetaVendedorFila[] = [];
  scrollBarHorizontal = window.innerWidth < 1200;
  /** Tablero que alimenta los gráficos: el del vendedor seleccionado o, por defecto, el del equipo. */
  tableroGraficos: TableroMeta | null = null;
  errorGraficos: string | null = null;
  cargandoGraficos = false;
  configDiario: ChartConfiguration<'bar' | 'line'> | null = null;
  configMensual: ChartConfiguration<'bar' | 'line'> | null = null;

  readonly tipoSeleccion = SelectionType.single;
  /** Identidad de fila para ngx-datatable (acepta también grupos, que aquí no existen). */
  readonly identidadFila = (x: unknown): string => this.idFila(x as MetaVendedorFila);

  readonly formatearPesos = formatearPesos;
  readonly formatearAvance = formatearAvance;
  readonly anchoBarraAvance = anchoBarraAvance;
  readonly tieneMeta = tieneMeta;

  private metaService = inject(MetaService);
  private destroyRef = inject(DestroyRef);
  private locale = inject(LOCALE_ID);
  private injector = inject(Injector);

  private tableroVendedor: TableroMeta | null = null;
  // switchMap descarta la respuesta anterior si llega una carga nueva (refresco, botón o selección).
  private cargaEquipo$ = new Subject<void>();
  private cargaVendedor$ = new Subject<MetaVendedorFila | null>();

  constructor() {
    this.cargaEquipo$
      .pipe(
        tap(() => {
          this.cargando = true;
          this.error = null;
        }),
        switchMap(() => this.metaService.tableroEquipo().pipe(
          map((tablero): TableroEquipo | null => tablero),
          catchError((error: HttpErrorResponse) => {
            console.error('Error al obtener las metas:', error);
            return of(null);
          })
        )),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(tablero => {
        if (tablero) {
          this.tablero = tablero;
          this.actualizarGraficos();
        } else {
          this.error = 'No se pudieron cargar las metas.';
        }
        this.cargando = false;
      });

    this.cargaVendedor$
      .pipe(
        switchMap(fila => {
          if (!fila) {
            return EMPTY;
          }
          return this.metaService.tableroVendedor(fila.codigo, fila.tipo).pipe(
            map((tablero): TableroMeta | null => tablero),
            catchError((error: HttpErrorResponse) => {
              console.error('Error al obtener el tablero del vendedor:', error);
              return of(null);
            })
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(tablero => {
        if (tablero) {
          this.tableroVendedor = tablero;
          this.errorGraficos = null;
          this.actualizarGraficos();
        } else {
          this.errorGraficos = 'No se pudo cargar el vendedor.';
        }
        this.cargandoGraficos = false;
      });

    interval(REFRESCO_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cargar());
  }

  ngOnInit(): void {
    this.cargar();
  }

  /** Recarga el equipo y, si hay un vendedor seleccionado, también su tablero. */
  cargar(): void {
    this.cargaEquipo$.next();
    if (this.seleccionado) {
      this.cargaVendedor$.next(this.seleccionado);
    }
  }

  seleccionar(fila: MetaVendedorFila): void {
    if (this.esSeleccionada(fila)) {
      return;
    }
    this.seleccionado = fila;
    this.filasSeleccionadas = [fila];
    this.tableroVendedor = null;
    this.errorGraficos = null;
    this.cargandoGraficos = true;
    this.actualizarGraficos();
    this.cargaVendedor$.next(fila);
  }

  verEquipo(): void {
    const anterior = this.seleccionado;
    this.seleccionado = null;
    this.filasSeleccionadas = [];
    this.tableroVendedor = null;
    this.errorGraficos = null;
    this.cargandoGraficos = false;
    this.cargaVendedor$.next(null);
    this.actualizarGraficos();
    if (anterior) {
      // El botón "Ver equipo" desaparece: el foco vuelve al botón del vendedor que estaba seleccionado.
      // ngx-datatable recrea las celdas de forma diferida: se reintenta hasta que el botón exista.
      afterNextRender(() => this.enfocarFila(anterior), { injector: this.injector });
    }
  }

  private enfocarFila(fila: MetaVendedorFila, intentos = 10): void {
    const boton = document.getElementById(this.idFila(fila));
    if (boton) {
      boton.focus();
    } else if (intentos > 0) {
      setTimeout(() => this.enfocarFila(fila, intentos - 1), 20);
    }
  }

  /** Evento (select) de ngx-datatable: un clic en la fila. */
  alSeleccionar(evento: { selected: MetaVendedorFila[] }): void {
    const fila = evento.selected[0];
    if (fila) {
      this.seleccionar(fila);
    }
  }

  idFila = (fila: MetaVendedorFila): string => `fila-meta-${fila.codigo}-${fila.tipo}`;

  esSeleccionada(fila: MetaVendedorFila): boolean {
    return this.seleccionado?.codigo === fila.codigo && this.seleccionado?.tipo === fila.tipo;
  }

  private actualizarGraficos(): void {
    const nuevo = this.seleccionado ? this.tableroVendedor : (this.tablero?.equipo ?? null);
    if (nuevo === this.tableroGraficos) {
      return;
    }
    this.tableroGraficos = nuevo;
    this.configDiario = nuevo ? graficoDiario(nuevo) : null;
    this.configMensual = nuevo ? graficoMensual(nuevo) : null;
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

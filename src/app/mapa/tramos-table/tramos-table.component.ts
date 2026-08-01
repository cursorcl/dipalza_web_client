import { Component, DestroyRef, inject, Input, OnChanges, signal, SimpleChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NodoParada } from '../detectar-paradas';
import { GeocodificacionService } from '../geocodificacion.service';

export interface FilaTramo {
  numero: number;
  tipo: string;
  calle: string | null;
  horaDetencion: string;
  horaFin: string | null;
}

@Component({
  selector: 'app-tramos-table',
  imports: [],
  templateUrl: './tramos-table.component.html',
  styleUrl: './tramos-table.component.scss'
})
export class TramosTableComponent implements OnChanges {
  @Input() nodos: NodoParada[] = [];

  filas = signal<FilaTramo[]>([]);
  colapsado = signal(false);

  private geocodificacionService = inject(GeocodificacionService);
  private destroyRef = inject(DestroyRef);
  private generacionActual = 0;

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['nodos']) return;

    this.generacionActual++;
    const generacion = this.generacionActual;

    const filasIniciales: FilaTramo[] = this.nodos.map((nodo, indice) => ({
      numero: nodo.numero,
      tipo: this.tipoDeNodo(nodo),
      calle: null,
      horaDetencion: this.formatearHora(nodo.comienzo),
      horaFin: indice + 1 < this.nodos.length ? this.formatearHora(this.nodos[indice + 1].comienzo) : null
    }));
    this.filas.set(filasIniciales);

    this.nodos.forEach((nodo, indice) => {
      this.geocodificacionService.obtenerCalle(nodo.latitud, nodo.longitud)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: respuesta => {
            if (generacion !== this.generacionActual) return;
            const actualizado = this.filas().map((fila, i) =>
              i === indice ? { ...fila, calle: respuesta.calle } : fila
            );
            this.filas.set(actualizado);
          },
          error: () => {
            if (generacion !== this.generacionActual) return;
            const actualizado = this.filas().map((fila, i) =>
              i === indice ? { ...fila, calle: 'Calle no disponible' } : fila
            );
            this.filas.set(actualizado);
          }
        });
    });
  }

  alternarColapso(): void {
    this.colapsado.set(!this.colapsado());
  }

  private tipoDeNodo(nodo: NodoParada): string {
    if (nodo.esParada) return `Parada ${nodo.numero}`;
    if (nodo.esInicio) return 'Inicio';
    return 'Última posición';
  }

  private formatearHora(fechaHora: string): string {
    return new Date(fechaHora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
}

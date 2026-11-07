import { Component, computed, inject, Input, signal } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '@core';
import { VendedorListItem } from '../../models/model';
import { cantidadDias, superaUmbralAviso, validarRango } from '../datos-reporte';
import { ProgresoReporte, ReporteCancelado, ReporteUbicacionesService } from '../reporte-ubicaciones.service';

@Component({
  selector: 'app-reporte-ubicaciones-dialog',
  imports: [],
  templateUrl: './reporte-ubicaciones-dialog.component.html',
  styleUrl: './reporte-ubicaciones-dialog.component.scss',
})
export class ReporteUbicacionesDialogComponent {
  @Input() vendedores: VendedorListItem[] = [];

  private readonly servicio = inject(ReporteUbicacionesService);
  private readonly modal = inject(NgbActiveModal);
  private readonly auth = inject(AuthService);

  readonly desde = signal(new Date().toLocaleDateString('en-CA'));
  readonly hasta = signal(new Date().toLocaleDateString('en-CA'));
  readonly seleccionados = signal<Set<string>>(new Set());
  readonly generando = signal(false);
  readonly progreso = signal<ProgresoReporte | null>(null);
  readonly error = signal<string | null>(null);

  readonly errorRango = computed(() => validarRango(this.desde(), this.hasta()));
  readonly avisoVolumen = computed(
    () =>
      !this.errorRango() &&
      superaUmbralAviso(this.seleccionados().size, cantidadDias(this.desde(), this.hasta())),
  );
  readonly puedeGenerar = computed(
    () => !this.errorRango() && this.seleccionados().size > 0 && !this.generando(),
  );
  readonly todosSeleccionados = computed(
    () => this.vendedores.length > 0 && this.seleccionados().size === this.vendedores.length,
  );

  private controlador: AbortController | null = null;

  clave(v: VendedorListItem): string {
    return `${v.vendedorId}_${v.vendedorCodigo}`;
  }

  estaSeleccionado(v: VendedorListItem): boolean {
    return this.seleccionados().has(this.clave(v));
  }

  alternar(v: VendedorListItem): void {
    const nuevo = new Set(this.seleccionados());
    const k = this.clave(v);
    if (nuevo.has(k)) nuevo.delete(k);
    else nuevo.add(k);
    this.seleccionados.set(nuevo);
  }

  alternarTodos(): void {
    this.seleccionados.set(
      this.todosSeleccionados() ? new Set() : new Set(this.vendedores.map(v => this.clave(v))),
    );
  }

  onDesde(evento: Event): void {
    this.desde.set((evento.target as HTMLInputElement).value);
  }

  onHasta(evento: Event): void {
    this.hasta.set((evento.target as HTMLInputElement).value);
  }

  async generar(): Promise<void> {
    if (!this.puedeGenerar()) return;
    this.error.set(null);
    this.progreso.set(null);
    this.generando.set(true);
    const controlador = new AbortController();
    this.controlador = controlador;

    const sesion = this.auth.currentUserValue;
    const usuario = sesion ? `${sesion.firstName ?? ''} ${sesion.lastName ?? ''}`.trim() || null : null;
    const elegidos = this.vendedores
      .filter(v => this.estaSeleccionado(v))
      .map(v => ({ codigo: v.vendedorId, tipo: v.vendedorCodigo, nombre: v.vendedorNombre }));

    try {
      const { blob, nombre } = await this.servicio.generar(
        { vendedores: elegidos, desde: this.desde(), hasta: this.hasta(), usuario },
        p => this.progreso.set(p),
        controlador.signal,
      );
      this.descargar(blob, nombre);
      this.generando.set(false);
      this.modal.close();
    } catch (e) {
      if (!(e instanceof ReporteCancelado)) {
        this.error.set(e instanceof Error ? e.message : 'No se pudo generar el reporte');
      }
      this.generando.set(false);
    } finally {
      this.controlador = null;
    }
  }

  cancelar(): void {
    this.controlador?.abort();
  }

  cerrar(): void {
    this.cancelar();
    this.modal.dismiss();
  }

  private descargar(blob: Blob, nombre: string): void {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    enlace.click();
    URL.revokeObjectURL(url);
  }
}

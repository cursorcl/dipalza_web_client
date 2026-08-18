import { Component, EventEmitter, Input, Output } from '@angular/core';
import { HistorialResumenDiaDTO } from '../models/model';

@Component({
  selector: 'app-historial-panel',
  imports: [],
  templateUrl: './historial-panel.component.html',
  styleUrl: './historial-panel.component.scss'
})
export class HistorialPanelComponent {
  @Input() vendedorNombre = '';
  @Input() fechas: HistorialResumenDiaDTO[] = [];
  @Input() cargando = false;
  @Output() fechaSeleccionada = new EventEmitter<string>();
  @Output() cerrar = new EventEmitter<void>();

  onSeleccionar(fecha: HistorialResumenDiaDTO): void {
    this.fechaSeleccionada.emit(fecha.dia);
  }

  onCerrar(): void {
    this.cerrar.emit();
  }

  formatearFecha(dia: string): string {
    return new Date(`${dia}T00:00:00`).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatearHora(fechaHora: string): string {
    return new Date(fechaHora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
}

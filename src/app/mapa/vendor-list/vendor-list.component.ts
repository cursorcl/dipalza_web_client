import { Component, EventEmitter, Input, Output } from '@angular/core';
import { VendedorListItem } from '../models/model';

@Component({
  selector: 'app-vendor-list',
  imports: [],
  templateUrl: './vendor-list.component.html',
  styleUrl: './vendor-list.component.scss'
})
export class VendorListComponent {
  @Input() vendedores: VendedorListItem[] = [];
  @Input() selectedIds: Set<string> = new Set();
  @Output() vendedorSeleccionado = new EventEmitter<string>();
  @Output() trayectoriaToggled = new EventEmitter<VendedorListItem>();

  onDoubleClick(vendedorId: string): void {
    this.vendedorSeleccionado.emit(vendedorId);
  }

  isSelected(vendedor: VendedorListItem): boolean {
    return this.selectedIds.has(`${vendedor.vendedorId}_${vendedor.vendedorCodigo}`);
  }

  onToggleTrayectoria(vendedor: VendedorListItem, event: Event): void {
    this.trayectoriaToggled.emit(vendedor);
    // Reafirma el estado del checkbox según la fuente de verdad (selectedIds).
    // Esto corrige el "check" optimista del navegador cuando el toggle no
    // agrega al vendedor a la selección (historial vacío) o cuando la
    // respuesta del servidor aún no ha llegado (ver toggleTrayectoria en
    // MapaComponent, que actualiza selectedIds de forma asíncrona).
    (event.target as HTMLInputElement).checked = this.isSelected(vendedor);
  }
}

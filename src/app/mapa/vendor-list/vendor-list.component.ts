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

  onToggleTrayectoria(vendedor: VendedorListItem): void {
    this.trayectoriaToggled.emit(vendedor);
  }
}

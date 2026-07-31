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
  @Input() selectedId: string | null = null;
  @Output() vendedorSeleccionado = new EventEmitter<string>();
  @Output() trayectoriaToggled = new EventEmitter<VendedorListItem>();

  onDoubleClick(vendedorId: string): void {
    this.vendedorSeleccionado.emit(vendedorId);
  }

  onSeleccionar(vendedor: VendedorListItem): void {
    this.trayectoriaToggled.emit(vendedor);
  }

  isSelected(vendedor: VendedorListItem): boolean {
    return this.selectedId === `${vendedor.vendedorId}_${vendedor.vendedorCodigo}`;
  }
}

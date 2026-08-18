import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
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
  @Output() historialSolicitado = new EventEmitter<VendedorListItem>();

  colapsado = signal(false);

  alternarColapso(): void {
    this.colapsado.set(!this.colapsado());
  }

  onDoubleClick(vendedorId: string): void {
    this.vendedorSeleccionado.emit(vendedorId);
  }

  onSeleccionar(vendedor: VendedorListItem): void {
    this.trayectoriaToggled.emit(vendedor);
  }

  onHistorial(event: Event, vendedor: VendedorListItem): void {
    event.stopPropagation();
    this.historialSolicitado.emit(vendedor);
  }

  isSelected(vendedor: VendedorListItem): boolean {
    return this.selectedId === `${vendedor.vendedorId}_${vendedor.vendedorCodigo}`;
  }
}

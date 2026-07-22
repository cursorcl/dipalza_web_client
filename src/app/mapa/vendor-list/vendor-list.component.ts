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
  @Output() vendedorSeleccionado = new EventEmitter<string>();

  onDoubleClick(vendedorId: string): void {
    this.vendedorSeleccionado.emit(vendedorId);
  }
}

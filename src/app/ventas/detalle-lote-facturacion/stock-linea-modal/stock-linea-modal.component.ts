import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ItemComparado } from '../../models/model';

@Component({
  selector: 'app-stock-linea-modal',
  imports: [CommonModule],
  templateUrl: './stock-linea-modal.component.html'
})
export class StockLineaModalComponent {
  @Input() item!: ItemComparado;

  constructor(public activeModal: NgbActiveModal) {}
}

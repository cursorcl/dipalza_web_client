import { Component, Input } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { Usuario } from '../models/model';

@Component({
  selector: 'app-ver-usuario',
  imports: [],
  templateUrl: './ver-usuario.component.html',
  styleUrl: './ver-usuario.component.scss'
})
export class VerUsuarioComponent {
  @Input() usuario!: Usuario;

  constructor(public activeModal: NgbActiveModal) {}
}

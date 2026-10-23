import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FacturaFaltantesDTO, ItemFaltanteDTO } from '../models/model';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-listado-detalle-faltantes',
  imports: [CommonModule, RouterLink],
  templateUrl: './listado-detalle-faltantes.component.html',
  styleUrl: './listado-detalle-faltantes.component.scss'
})
export class ListadoDetalleFaltantesComponent {

  factura: FacturaFaltantesDTO | undefined;
  rows: ItemFaltanteDTO[] = [];
  facturaEstimada = false;

  constructor(private router: Router, private location: Location) {
    const navigation = this.router.getCurrentNavigation();

    if (navigation?.extras?.state) {
      this.factura = navigation.extras.state['facturaSeleccionada'] as FacturaFaltantesDTO;
      this.rows = this.factura?.items ?? [];
      this.facturaEstimada = this.rows.some(i => i.facturaEstimada);
    } else {
      console.warn('No hay datos en el state, posiblemente recarga de página');
    }
  }

  imprimir() {
    window.print();
  }

  goBack() {
    this.location.back();
  }
}

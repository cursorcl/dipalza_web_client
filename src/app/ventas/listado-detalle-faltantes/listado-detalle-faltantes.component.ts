import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FacturaFaltantesDTO, ItemFaltanteDTO } from '../models/model';
import { Router, RouterLink } from '@angular/router';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';

@Component({
  selector: 'app-listado-detalle-faltantes',
  imports: [CommonModule, NgxDatatableModule, RouterLink],
  templateUrl: './listado-detalle-faltantes.component.html',
  styleUrl: './listado-detalle-faltantes.component.scss'
})
export class ListadoDetalleFaltantesComponent {

  factura: FacturaFaltantesDTO | undefined;
  rows: ItemFaltanteDTO[] = [];

  constructor(private router: Router, private location: Location) {
    const navigation = this.router.getCurrentNavigation();

    if (navigation?.extras?.state) {
      this.factura = navigation.extras.state['facturaSeleccionada'] as FacturaFaltantesDTO;
      this.rows = this.factura?.items ?? [];
    } else {
      console.warn('No hay datos en el state, posiblemente recarga de página');
    }
  }

  goBack() {
    this.location.back();
  }
}

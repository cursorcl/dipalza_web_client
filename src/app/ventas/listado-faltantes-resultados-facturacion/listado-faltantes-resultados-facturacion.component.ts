import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { VentaItemFaltante } from '../models/model';
import { Router, RouterLink } from '@angular/router';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';

@Component({
  selector: 'app-listado-faltantes-resultados-facturacion',
  imports: [CommonModule, NgxDatatableModule, RouterLink],
  templateUrl: './listado-faltantes-resultados-facturacion.component.html',
  styleUrl: './listado-faltantes-resultados-facturacion.component.scss'
})
export class ListadoFaltantesResultadosFacturacionComponent {

  nombreCliente: string | undefined;
  rows: VentaItemFaltante[] = [];

  constructor(private router: Router, private location: Location) {
    const navigation = this.router.getCurrentNavigation();

    if (navigation?.extras?.state) {
      this.rows = navigation.extras.state['faltantes'] as VentaItemFaltante[];
      this.nombreCliente = navigation.extras.state['nombreCliente'];
    } else {
      console.warn('No hay datos en el state, posiblemente recarga de página');
    }
  }

  goBack() {
    this.location.back();
  }
}

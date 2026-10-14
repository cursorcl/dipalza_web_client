import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FacturaResultadoDTO, VentaItemResultado } from '../models/model';
import { Router, RouterLink } from '@angular/router';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';

@Component({
  selector: 'app-listado-items-resultados-facturacion',
  imports: [CommonModule, NgxDatatableModule, RouterLink],
  templateUrl: './listado-items-resultados-facturacion.component.html',
  styleUrl: './listado-items-resultados-facturacion.component.scss'
})
export class ListadoItemsResultadosFacturacionComponent {

  factura: FacturaResultadoDTO | undefined;
  rows: VentaItemResultado[] = [];

  constructor(private router: Router, private location: Location) {
    const navigation = this.router.getCurrentNavigation();

    if (navigation?.extras?.state) {
      this.factura = navigation.extras.state['facturaSeleccionada'] as FacturaResultadoDTO;
      this.rows = this.factura?.items ?? [];
    } else {
      console.warn('No hay datos en el state, posiblemente recarga de página');
    }
  }

  goBack() {
    this.location.back();
  }
}

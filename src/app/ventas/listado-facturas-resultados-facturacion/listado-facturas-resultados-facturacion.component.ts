import { Component } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ClienteResultadoDTO, FacturaResultadoDTO, VendedorResultadoDTO } from '../models/model';
import { Router, RouterLink } from '@angular/router';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';

interface FilaFactura {
  factura: FacturaResultadoDTO;
  rutCliente: string | null;
  nombreCliente: string | null;
}

@Component({
  selector: 'app-listado-facturas-resultados-facturacion',
  imports: [CommonModule, NgxDatatableModule, RouterLink],
  templateUrl: './listado-facturas-resultados-facturacion.component.html',
  styleUrl: './listado-facturas-resultados-facturacion.component.scss'
})
export class ListadoFacturasResultadosFacturacionComponent {

  vendedor: VendedorResultadoDTO | undefined;
  filasFacturas: FilaFactura[] = [];
  clientesConFaltantes: ClienteResultadoDTO[] = [];

  constructor(private router: Router, private location: Location) {
    const navigation = this.router.getCurrentNavigation();

    if (navigation?.extras?.state) {
      this.vendedor = navigation.extras.state['vendedorSeleccionado'] as VendedorResultadoDTO;
      const clientes = this.vendedor?.clientes ?? [];

      this.filasFacturas = clientes.flatMap(cliente =>
        cliente.facturas.map(factura => ({
          factura,
          rutCliente: cliente.rutCliente,
          nombreCliente: cliente.nombreCliente
        }))
      );
      this.clientesConFaltantes = clientes.filter(cliente => cliente.faltantes.length > 0);
    } else {
      console.warn('No hay datos en el state, posiblemente recarga de página');
    }
  }

  gotoItems(fila: FilaFactura) {
    this.router.navigate(['/ventas/resultados-facturacion/items'], {
      state: { facturaSeleccionada: fila.factura }
    });
  }

  gotoFaltantes(cliente: ClienteResultadoDTO) {
    this.router.navigate(['/ventas/resultados-facturacion/faltantes'], {
      state: { faltantes: cliente.faltantes, nombreCliente: cliente.nombreCliente }
    });
  }

  goBack() {
    this.location.back();
  }
}

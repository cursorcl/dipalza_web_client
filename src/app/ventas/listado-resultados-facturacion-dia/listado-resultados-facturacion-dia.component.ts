import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { VendedorResultadoDTO } from '../models/model';
import { Router, RouterLink } from '@angular/router';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { DataResultService } from '../models/data-results.service';

@Component({
  selector: 'app-listado-resultados-facturacion-dia',
  imports: [CommonModule, NgxDatatableModule, RouterLink],
  templateUrl: './listado-resultados-facturacion-dia.component.html',
  styleUrl: './listado-resultados-facturacion-dia.component.scss'
})
export class ListadoResultadosFacturacionDiaComponent implements OnInit {

  rows: VendedorResultadoDTO[] = [];
  loadingIndicator = true;

  constructor(
    private router: Router,
    private location: Location,
    private dataResultService: DataResultService
  ) {
  }

  ngOnInit(): void {
    this.rows = this.dataResultService.getPorVendedor();
    this.loadingIndicator = false;
  }

  gotoDetalle(row: VendedorResultadoDTO) {
    this.router.navigate(['/ventas/resultados-facturacion/facturas'], {
      state: { vendedorSeleccionado: row }
    });
  }

  goBack() {
    this.location.back();
  }
}

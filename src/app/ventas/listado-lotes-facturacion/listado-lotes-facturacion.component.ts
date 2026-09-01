import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { VentasService } from '../ventas.service';
import { LoteFacturacionResumen } from '../models/model';

@Component({
  selector: 'app-listado-lotes-facturacion',
  imports: [CommonModule, NgxDatatableModule, RouterLink],
  templateUrl: './listado-lotes-facturacion.component.html',
  styleUrl: './listado-lotes-facturacion.component.scss'
})
export class ListadoLotesFacturacionComponent implements OnInit {

  rows: LoteFacturacionResumen[] = [];
  loadingIndicator = true;
  page = 0;
  size = 20;
  totalElements = 0;

  private ventasService = inject(VentasService);
  private router = inject(Router);
  private location = inject(Location);

  ngOnInit(): void {
    this.cargarPagina();
  }

  cargarPagina(): void {
    this.loadingIndicator = true;
    this.ventasService.obtenerLotesFacturacion(this.page, this.size).subscribe({
      next: pagina => {
        this.rows = pagina.content;
        this.totalElements = pagina.totalElements;
        this.loadingIndicator = false;
      },
      error: () => {
        this.loadingIndicator = false;
      }
    });
  }

  onPage(event: { offset: number }): void {
    this.page = event.offset;
    this.cargarPagina();
  }

  verDetalle(row: LoteFacturacionResumen): void {
    this.router.navigate(['/ventas/lotes-facturacion', row.id]);
  }

  goBack(): void {
    this.location.back();
  }
}

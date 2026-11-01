import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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
  error = false;

  private ventasService = inject(VentasService);
  private location = inject(Location);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  ngOnInit(): void {
    // La página viaja en la URL (?pagina=3, contando desde 1) para que al volver desde el
    // detalle de una corrida, o al recargar, se mantenga la misma página.
    const pagina = Number(this.route.snapshot.queryParamMap.get('pagina'));
    if (Number.isInteger(pagina) && pagina > 1) {
      this.page = pagina - 1;
    }
    this.cargarPagina();
  }

  cargarPagina(): void {
    this.loadingIndicator = true;
    this.error = false;
    this.ventasService.obtenerLotesFacturacion(this.page, this.size).subscribe({
      next: pagina => {
        this.rows = pagina.content;
        this.totalElements = pagina.totalElements;
        this.loadingIndicator = false;
      },
      error: () => {
        this.error = true;
        this.loadingIndicator = false;
      }
    });
  }

  onPage(event: { offset: number }): void {
    this.page = event.offset;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { pagina: this.page > 0 ? this.page + 1 : null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    this.cargarPagina();
  }

  goBack(): void {
    this.location.back();
  }
}

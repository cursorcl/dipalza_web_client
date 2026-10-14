import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DatatableComponent, NgxDatatableModule } from '@swimlane/ngx-datatable';
import { HttpErrorResponse } from '@angular/common/http';
import { VentasService } from '../ventas.service';
import { ClienteFaltantesDTO, VendedorFaltantesDTO } from '../models/model';

interface ProductoAgregado {
  codigoProducto: string;
  nombreProducto: string;
  cantidadFaltanteTotal: number;
  piezasFaltanteTotal: number;
}

@Component({
  selector: 'app-listado-vendedores-faltantes',
  imports: [CommonModule, FormsModule, NgxDatatableModule, RouterLink],
  templateUrl: './listado-vendedores-faltantes.component.html',
  styleUrl: './listado-vendedores-faltantes.component.scss'
})
export class ListadoVendedoresFaltantesComponent implements OnInit {

  fecha: string | null = null;
  rows: VendedorFaltantesDTO[] = [];
  productosAgregados: ProductoAgregado[] = [];
  vista: 'vendedor' | 'producto' = 'vendedor';
  loadingIndicator = true;

  @ViewChild(DatatableComponent) table!: DatatableComponent;

  constructor(private ventaService: VentasService, private router: Router, private location: Location) {
  }

  ngOnInit(): void {
    // Sin fecha: el backend resuelve la última fecha real con faltantes.
    this.cargar(undefined);
  }

  private cargar(fecha: string | undefined) {
    this.loadingIndicator = true;
    this.ventaService.obtenerFaltantes(fecha).subscribe({
      next: (resultado) => {
        this.fecha = resultado.fecha;
        this.rows = resultado.vendedores;
        this.productosAgregados = this.calcularProductosAgregados(resultado.vendedores);
        this.loadingIndicator = false;
        // La tabla debe iniciar con todas las filas expandidas; expandAllRows() necesita que
        // ngx-datatable ya haya procesado las filas nuevas, por eso se llama en el próximo tick.
        setTimeout(() => this.table?.rowDetail?.expandAllRows());
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al obtener los faltantes:', error);
        this.loadingIndicator = false;
      }
    });
  }

  // Suma el faltante REAL (solicitada - asignada), no la cantidad solicitada completa -- una
  // línea con stock parcial ya alcanzó a cubrir una parte, esa parte no debe contarse como faltante.
  private calcularProductosAgregados(vendedores: VendedorFaltantesDTO[]): ProductoAgregado[] {
    const totales = new Map<string, ProductoAgregado>();
    for (const vendedor of vendedores) {
      for (const cliente of vendedor.clientes) {
        for (const item of cliente.items) {
          const existente = totales.get(item.codigoProducto);
          if (existente) {
            existente.cantidadFaltanteTotal += item.cantidadFaltante ?? 0;
            existente.piezasFaltanteTotal += item.piezasFaltantes ?? 0;
          } else {
            totales.set(item.codigoProducto, {
              codigoProducto: item.codigoProducto,
              nombreProducto: item.nombreProducto,
              cantidadFaltanteTotal: item.cantidadFaltante ?? 0,
              piezasFaltanteTotal: item.piezasFaltantes ?? 0
            });
          }
        }
      }
    }
    return Array.from(totales.values()).sort((a, b) => a.codigoProducto.localeCompare(b.codigoProducto));
  }

  onFechaChange() {
    if (this.fecha) {
      this.cargar(this.fecha);
    }
  }

  diaAnterior() {
    this.moverDia(-1);
  }

  diaSiguiente() {
    this.moverDia(1);
  }

  private moverDia(delta: number) {
    if (!this.fecha) return;
    const fecha = new Date(this.fecha + 'T00:00:00');
    fecha.setDate(fecha.getDate() + delta);
    this.fecha = fecha.toISOString().split('T')[0];
    this.cargar(this.fecha);
  }

  toggleExpandRow(row: VendedorFaltantesDTO) {
    this.table.rowDetail.toggleExpandRow(row);
  }

  getRowDetailHeight(row?: VendedorFaltantesDTO): number {
    if (!row) return 50;
    return (row.clientes.length * 40) + 50;
  }

  gotoDetalle(cliente: ClienteFaltantesDTO) {
    this.router.navigate(['/ventas/faltantes/detalle'], {
      state: { clienteSeleccionado: cliente }
    });
  }

  goBack() {
    this.location.back();
  }
}

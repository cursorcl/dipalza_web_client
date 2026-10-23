import { AfterViewInit, Component, ElementRef, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { VentasService } from '../ventas.service';
import { FacturaFaltantesDTO } from '../models/model';

interface ProductoAgregado {
  codigoProducto: string;
  nombreProducto: string;
  cantidadFaltanteTotal: number;
  piezasFaltanteTotal: number;
}

@Component({
  selector: 'app-listado-vendedores-faltantes',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './listado-vendedores-faltantes.component.html',
  styleUrl: './listado-vendedores-faltantes.component.scss'
})
export class ListadoVendedoresFaltantesComponent implements OnInit, AfterViewInit {

  fecha: string | null = null;
  facturas: FacturaFaltantesDTO[] = [];
  productosAgregados: ProductoAgregado[] = [];
  vista: 'factura' | 'producto' = 'factura';
  loadingIndicator = true;

  constructor(private ventaService: VentasService, private location: Location, private host: ElementRef<HTMLElement>) {
  }

  ngOnInit(): void {
    // Sin fecha: el backend resuelve la última fecha real con faltantes.
    this.cargar(undefined);
  }

  // Mismo criterio que Hoja de Ruta: el navbar superior es position:fixed, así que la barra
  // de controles necesita un "top" igual a su altura real para quedar pegada justo debajo.
  ngAfterViewInit(): void {
    const navbar = document.querySelector<HTMLElement>('nav.main-navbar');
    const alto = navbar?.offsetHeight ?? 70;
    this.host.nativeElement.style.setProperty('--faltantes-navbar-h', `${alto}px`);
  }

  private cargar(fecha: string | undefined) {
    this.loadingIndicator = true;
    this.ventaService.obtenerFaltantes(fecha).subscribe({
      next: (resultado) => {
        this.fecha = resultado.fecha;
        this.facturas = resultado.facturas;
        this.productosAgregados = this.calcularProductosAgregados(resultado.facturas);
        this.loadingIndicator = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al obtener los faltantes:', error);
        this.loadingIndicator = false;
      }
    });
  }

  private calcularProductosAgregados(facturas: FacturaFaltantesDTO[]): ProductoAgregado[] {
    const totales = new Map<string, ProductoAgregado>();
    for (const factura of facturas) {
      for (const item of factura.items) {
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
    return Array.from(totales.values()).sort((a, b) => a.codigoProducto.localeCompare(b.codigoProducto));
  }

  get hayDatos(): boolean {
    return this.facturas.length > 0;
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

  imprimir() {
    window.print();
  }

  goBack() {
    this.location.back();
  }
}

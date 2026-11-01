import { AfterViewInit, Component, ElementRef, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { VentasService } from '../ventas.service';
import { FacturaFaltantesDTO } from '../models/model';

interface ProductoAgregado {
  codigoProducto: string;
  nombreProducto: string;
  cantidadFaltanteTotal: number;
  piezasFaltanteTotal: number;
}

const FORMATO_FECHA = /^\d{4}-\d{2}-\d{2}$/;

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

  private route = inject(ActivatedRoute);
  private router = inject(Router);

  constructor(private ventaService: VentasService, private location: Location, private host: ElementRef<HTMLElement>) {
  }

  ngOnInit(): void {
    // La fecha y la vista viajan en la URL (?fecha=2026-10-15&vista=producto) para poder
    // recargar, volver atrás o compartir el enlace sin perder lo elegido.
    const parametros = this.route.snapshot.queryParamMap;
    const vista = parametros.get('vista');
    if (vista === 'factura' || vista === 'producto') {
      this.vista = vista;
    }
    const fecha = parametros.get('fecha');
    // Sin fecha: el backend resuelve la última fecha real con faltantes.
    this.cargar(fecha && FORMATO_FECHA.test(fecha) ? fecha : undefined);
  }

  cambiarVista(vista: 'factura' | 'producto'): void {
    this.vista = vista;
    this.actualizarUrl();
  }

  // replaceUrl: cambiar de día o de vista no agrega entradas al historial del navegador.
  private actualizarUrl(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { fecha: this.fecha, vista: this.vista === 'factura' ? null : this.vista },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
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
        this.actualizarUrl();
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

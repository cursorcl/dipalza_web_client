import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgbCollapseModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { VentasService } from '../ventas.service';
import { FacturaAuditoria, ItemComparado, LoteFacturacionDetalle, VentaAuditoria } from '../models/model';
import { StockLineaModalComponent } from './stock-linea-modal/stock-linea-modal.component';

@Component({
  selector: 'app-detalle-lote-facturacion',
  imports: [CommonModule, RouterLink, NgbCollapseModule],
  templateUrl: './detalle-lote-facturacion.component.html',
  styleUrl: './detalle-lote-facturacion.component.scss'
})
export class DetalleLoteFacturacionComponent implements OnInit {

  detalle: LoteFacturacionDetalle | null = null;
  cargando = true;
  error = false;

  ventaSeleccionada: VentaAuditoria | null = null;
  facturaAbiertaIdentificador: string | null = null;

  private ventasService = inject(VentasService);
  private route = inject(ActivatedRoute);
  private location = inject(Location);
  private modalService = inject(NgbModal);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.ventasService.obtenerLoteFacturacionDetalle(id).subscribe({
      next: detalle => {
        this.detalle = detalle;
        this.cargando = false;
      },
      error: () => {
        this.error = true;
        this.cargando = false;
      }
    });
  }

  goBack(): void {
    this.location.back();
  }

  diferenciaSignificativa(esperado: number, real: number | null): boolean {
    if(real === null) return true;
    return Math.abs(esperado - real) > 0.5;
  }

  /** Selecciona (o deselecciona, si ya estaba seleccionada) una venta del lote. */
  seleccionarVenta(venta: VentaAuditoria): void {
    this.ventaSeleccionada = this.ventaSeleccionada === venta ? null : venta;
    this.facturaAbiertaIdentificador = null;
  }

  /** Expande (o colapsa, si ya estaba abierta) la card de una factura. */
  toggleFactura(factura: FacturaAuditoria): void {
    this.facturaAbiertaIdentificador =
      this.facturaAbiertaIdentificador === factura.identificador ? null : factura.identificador;
  }

  /** Abre el popup con el stock antes/después de esta línea puntual. */
  verStock(item: ItemComparado): void {
    const modalRef = this.modalService.open(StockLineaModalComponent);
    modalRef.componentInstance.item = item;
  }
}

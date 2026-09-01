import { Component, inject, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { VentasService } from '../ventas.service';
import { LoteFacturacionDetalle } from '../models/model';

@Component({
  selector: 'app-detalle-lote-facturacion',
  imports: [CommonModule, RouterLink],
  templateUrl: './detalle-lote-facturacion.component.html',
  styleUrl: './detalle-lote-facturacion.component.scss'
})
export class DetalleLoteFacturacionComponent implements OnInit {

  detalle: LoteFacturacionDetalle | null = null;
  cargando = true;
  error = false;

  private ventasService = inject(VentasService);
  private route = inject(ActivatedRoute);
  private location = inject(Location);

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
}

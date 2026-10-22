import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { HttpErrorResponse } from '@angular/common/http';
import { VentasService } from '../ventas.service';
import { RutaHojaRutaDTO } from '../models/model';

interface FilaHojaRuta {
  codigoRuta: string;
  nombreRuta: string;
  codigoProducto: string;
  nombreProducto: string;
  numerosPiezas: string;
  cantidad: number;
  totalLinea: number;
}

@Component({
  selector: 'app-listado-hoja-ruta',
  imports: [CommonModule, FormsModule, NgxDatatableModule, RouterLink],
  templateUrl: './listado-hoja-ruta.component.html',
  styleUrl: './listado-hoja-ruta.component.scss'
})
export class ListadoHojaRutaComponent implements OnInit {

  fecha: string = '';
  rows: FilaHojaRuta[] = [];
  loadingIndicator = true;
  descargando: 'xlsx' | 'pdf' | null = null;
  error: string | null = null;

  constructor(private ventaService: VentasService, private location: Location) {
  }

  ngOnInit(): void {
    this.fecha = new Date().toISOString().split('T')[0];
    this.cargar();
  }

  private cargar() {
    if (!this.fecha) return;
    this.loadingIndicator = true;
    this.error = null;
    this.ventaService.obtenerHojaRuta(this.fecha).subscribe({
      next: (resultado) => {
        this.rows = this.aplanar(resultado.rutas);
        this.loadingIndicator = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error al obtener la Hoja de Ruta:', err);
        this.error = 'No se pudo cargar la información.';
        this.rows = [];
        this.loadingIndicator = false;
      }
    });
  }

  private aplanar(rutas: RutaHojaRutaDTO[]): FilaHojaRuta[] {
    const filas: FilaHojaRuta[] = [];
    for (const ruta of rutas) {
      for (const item of ruta.items) {
        filas.push({
          codigoRuta: ruta.codigoRuta,
          nombreRuta: ruta.nombreRuta,
          codigoProducto: item.codigoProducto,
          nombreProducto: item.nombreProducto,
          numerosPiezas: item.numerosPiezas,
          cantidad: item.cantidad,
          totalLinea: item.totalLinea
        });
      }
    }
    return filas;
  }

  onFechaChange() {
    this.cargar();
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
    this.cargar();
  }

  descargar(formato: 'xlsx' | 'pdf') {
    if (!this.fecha || this.descargando) return;
    this.error = null;
    this.descargando = formato;
    this.ventaService.descargarHojaRuta(this.fecha, formato).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `HojaRuta-${this.fecha}.${formato}`;
        link.click();
        URL.revokeObjectURL(url);
        this.descargando = null;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error al descargar la Hoja de Ruta:', err);
        this.error = 'No se pudo generar el archivo. Intenta nuevamente.';
        this.descargando = null;
      }
    });
  }

  goBack() {
    this.location.back();
  }
}

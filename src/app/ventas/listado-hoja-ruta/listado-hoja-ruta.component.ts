import { Component, OnInit } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { VentasService } from '../ventas.service';
import { RutaHojaRutaDTO } from '../models/model';

@Component({
  selector: 'app-listado-hoja-ruta',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './listado-hoja-ruta.component.html',
  styleUrl: './listado-hoja-ruta.component.scss'
})
export class ListadoHojaRutaComponent implements OnInit {

  fecha: string = '';
  rutas: RutaHojaRutaDTO[] = [];
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
        this.rutas = resultado.rutas;
        this.loadingIndicator = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Error al obtener la Hoja de Ruta:', err);
        this.error = 'No se pudo cargar la información.';
        this.rutas = [];
        this.loadingIndicator = false;
      }
    });
  }

  get hayDatos(): boolean {
    return this.rutas.some(r => r.items.length > 0);
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

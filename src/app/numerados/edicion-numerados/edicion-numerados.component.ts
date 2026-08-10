import { Component, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, Validators, FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Numerado, NumeradoPayload, Producto } from 'app/ventas/models/model';
import { VentasService } from 'app/ventas/ventas.service';

interface NumeradoForm {
  producto: Producto | null;
  numero: number;
  peso: number;
}

@Component({
  selector: 'app-edicion-numerados',
  imports: [ReactiveFormsModule],
  templateUrl: './edicion-numerados.component.html',
  styleUrl: './edicion-numerados.component.scss'
})
export class EdicionNumeradosComponent implements OnInit {
  form: FormGroup;

  productos: Producto[] = [];
  numeradoEnEdicion: Numerado | null = null;
  codigoProductoPreseleccionado: string | null = null;

  loading = false;
  error = '';
  success = '';

  constructor(private ventasService: VentasService, private router: Router) {
    const navigation = this.router.getCurrentNavigation();
    const state = navigation?.extras?.state;
    this.numeradoEnEdicion = (state?.['numerado'] as Numerado) ?? null;
    this.codigoProductoPreseleccionado = (state?.['codigoProductoPreseleccionado'] as string) ?? null;

    this.form = new FormGroup({
      producto: new FormControl<Producto | null>(null, Validators.required),
      numero: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
      peso: new FormControl<number | null>(null, [Validators.required, Validators.min(0.001)])
    });
  }

  get esEdicion(): boolean {
    return this.numeradoEnEdicion !== null;
  }

  ngOnInit(): void {
    this.ventasService.obtainProductos().subscribe({
      next: (productos) => {
        this.productos = productos.filter(p => p.numbered === true);
        this.preseleccionarProducto();
      },
      error: () => {
        this.error = 'No se pudo cargar la lista de productos.';
      }
    });
  }

  private preseleccionarProducto(): void {
    const codigo = this.numeradoEnEdicion?.codigoProducto ?? this.codigoProductoPreseleccionado;
    if (!codigo) {
      return;
    }
    const producto = this.productos.find(p => p.articulo === codigo) ?? null;
    this.form.patchValue({ producto });

    if (this.esEdicion) {
      this.form.get('producto')?.disable();
      this.form.patchValue({
        numero: this.numeradoEnEdicion?.numero,
        peso: this.numeradoEnEdicion?.peso
      });
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const data = this.form.getRawValue() as NumeradoForm;
    const payload: NumeradoPayload = {
      id: this.numeradoEnEdicion?.id,
      codigoProducto: data.producto?.articulo ?? '',
      numero: data.numero,
      peso: data.peso,
      estado: this.numeradoEnEdicion?.estado
    };

    this.loading = true;
    this.error = '';
    this.success = '';

    const peticion = this.esEdicion
      ? this.ventasService.actualizarNumerado(payload)
      : this.ventasService.crearNumerado(payload);

    peticion.subscribe({
      next: () => {
        this.loading = false;
        this.success = this.esEdicion ? 'Numerado actualizado correctamente.' : 'Numerado creado correctamente.';
        this.router.navigate(['/numerados']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.error = err.status === 400 && err.error?.message
          ? err.error.message
          : 'No se pudo guardar el numerado. Intente nuevamente.';
      }
    });
  }
}

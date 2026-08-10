import { Component, Input, OnInit } from '@angular/core';
import { ReactiveFormsModule, FormGroup, Validators, FormControl } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
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
  @Input() numeradoEnEdicion: Numerado | null = null;
  @Input() codigoProductoPreseleccionado: string | null = null;

  form: FormGroup;

  productos: Producto[] = [];

  loading = false;
  error = '';

  constructor(public activeModal: NgbActiveModal, private ventasService: VentasService) {
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
    // @Input() ya está poblado en este punto (Angular los setea antes de ngOnInit),
    // por eso esEdicion recién se puede usar de forma confiable acá y no en el constructor.
    if (!this.esEdicion) {
      this.form.get('numero')?.disable();
      this.form.get('producto')?.valueChanges.subscribe((producto: Producto | null) => {
        this.actualizarNumeroSugerido(producto);
      });
    }

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

  private actualizarNumeroSugerido(producto: Producto | null): void {
    const numeroControl = this.form.get('numero');
    if (!producto) {
      numeroControl?.setValue(null);
      return;
    }
    this.ventasService.obtainNumerados(producto.articulo).subscribe({
      next: (numerados) => {
        numeroControl?.setValue(this.calcularSiguienteNumero(numerados));
      },
      error: () => {
        numeroControl?.setValue(null);
        this.error = 'No se pudo calcular el número disponible para este producto.';
      }
    });
  }

  private calcularSiguienteNumero(numerados: Numerado[]): number {
    const usados = new Set(numerados.map(n => n.numero));
    let candidato = 1;
    while (usados.has(candidato)) {
      candidato++;
    }
    return candidato;
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

    if (!payload.codigoProducto) {
      this.error = 'No se pudo determinar el producto del numerado. Intente nuevamente.';
      this.loading = false;
      return;
    }

    if (payload.numero === null || payload.numero === undefined) {
      this.error = 'No se pudo asignar un número disponible para este producto. Intente nuevamente.';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = '';

    const peticion = this.esEdicion
      ? this.ventasService.actualizarNumerado(payload)
      : this.ventasService.crearNumerado(payload);

    peticion.subscribe({
      next: () => {
        this.loading = false;
        this.activeModal.close(true);
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

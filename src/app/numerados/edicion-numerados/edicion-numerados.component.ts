import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { ReactiveFormsModule, FormGroup, Validators, FormControl, AbstractControl, ValidationErrors } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbActiveModal, NgbTypeahead } from '@ng-bootstrap/ng-bootstrap';
import { Observable, OperatorFunction, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { Numerado, NumeradoPayload, Producto } from 'app/ventas/models/model';
import { VentasService } from 'app/ventas/ventas.service';

interface NumeradoForm {
  producto: Producto | string | null;
  numero: number;
  peso: number;
}

function productoSeleccionadoValidator(control: AbstractControl): ValidationErrors | null {
  return control.value && typeof control.value === 'string' ? { productoInvalido: true } : null;
}

@Component({
  selector: 'app-edicion-numerados',
  imports: [ReactiveFormsModule, NgbTypeahead],
  templateUrl: './edicion-numerados.component.html',
  styleUrl: './edicion-numerados.component.scss'
})
export class EdicionNumeradosComponent implements OnInit {
  @Input() numeradoEnEdicion: Numerado | null = null;
  @Input() codigoProductoPreseleccionado: string | null = null;

  @ViewChild('pesoInput') pesoInputRef?: ElementRef<HTMLInputElement>;

  form: FormGroup;

  productos: Producto[] = [];

  loading = false;
  error = '';
  guardadosCount = 0;

  constructor(public activeModal: NgbActiveModal, private ventasService: VentasService) {
    this.form = new FormGroup({
      producto: new FormControl<Producto | string | null>(null, [Validators.required, productoSeleccionadoValidator]),
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
      this.form.get('producto')?.valueChanges.subscribe((producto: Producto | string | null) => {
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

  buscarProducto: OperatorFunction<string, readonly Producto[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => {
        const t = term.toLowerCase().trim();
        if (t.length < 2) {
          return [];
        }
        return this.productos
          .filter(p => p.articulo.toLowerCase().includes(t) || p.descripcion.toLowerCase().includes(t))
          .slice(0, 10);
      })
    );

  formatearProducto = (p: Producto): string => p ? `${p.articulo} - ${p.descripcion}` : '';

  private actualizarNumeroSugerido(producto: Producto | string | null): void {
    const numeroControl = this.form.get('numero');
    if (!producto || typeof producto === 'string') {
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
    const producto = data.producto && typeof data.producto === 'object' ? data.producto : null;
    const payload: NumeradoPayload = {
      id: this.numeradoEnEdicion?.id,
      codigoProducto: producto?.articulo ?? '',
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
        if (this.esEdicion) {
          this.activeModal.close(true);
          return;
        }
        this.guardadosCount++;
        this.prepararSiguienteNumerado(producto);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        this.error = err.status === 400 && err.error?.message
          ? err.error.message
          : 'No se pudo guardar el numerado. Intente nuevamente.';
      }
    });
  }

  /**
   * Tras guardar un alta, deja el diálogo abierto con el mismo producto
   * seleccionado y el próximo número sugerido, para poder cargar varios
   * numerados seguidos del mismo producto sin reabrir el diálogo.
   */
  private prepararSiguienteNumerado(producto: Producto | null): void {
    this.form.get('peso')?.reset(null);
    this.form.get('peso')?.markAsUntouched();
    if (producto) {
      this.actualizarNumeroSugerido(producto);
    }
    setTimeout(() => this.pesoInputRef?.nativeElement.focus());
  }

  cerrar(): void {
    if (this.guardadosCount > 0) {
      this.activeModal.close(true);
    } else {
      this.activeModal.dismiss();
    }
  }
}

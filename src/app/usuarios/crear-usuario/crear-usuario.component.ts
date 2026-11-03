import { Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { NgbActiveModal, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { Observable, OperatorFunction, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { VendedorDTO } from 'app/mapa/models/model';
import { VendedorService } from 'app/mapa/vendedor.service';
import { UsuariosService } from '../usuarios.service';
import { CrearUsuarioPayload } from '../models/model';
import { mostrarErrorToast } from '../toast.util';

@Component({
  selector: 'app-crear-usuario',
  imports: [ReactiveFormsModule, NgbTypeahead],
  templateUrl: './crear-usuario.component.html',
  styleUrl: './crear-usuario.component.scss'
})
export class CrearUsuarioComponent implements OnInit {
  form: FormGroup;
  vendedores: VendedorDTO[] = [];
  vendedorSeleccionado: VendedorDTO | null = null;
  buscadorVendedorControl = new FormControl<string | VendedorDTO | null>('');
  // true: el usuario es un vendedor y su nombre se toma del vendedor elegido.
  // false: no es vendedor y el nombre se ingresa a mano (obligatorio).
  esVendedorControl = new FormControl<boolean>(true, { nonNullable: true });
  intentoGuardar = false;

  loading = false;

  constructor(
    public activeModal: NgbActiveModal,
    private usuariosService: UsuariosService,
    private vendedorService: VendedorService
  ) {
    this.form = new FormGroup({
      username: new FormControl<string>('', Validators.required),
      nombre: new FormControl<string>('', Validators.maxLength(100)),
      email: new FormControl<string>(''),
      password: new FormControl<string>('', [Validators.required, Validators.minLength(8)])
    });
  }

  ngOnInit(): void {
    this.vendedorService.getVendedores().subscribe({
      next: (vendedores) => { this.vendedores = vendedores; },
      error: () => { mostrarErrorToast('No se pudo cargar la lista de vendedores.'); }
    });
    this.buscadorVendedorControl.valueChanges.subscribe(v => {
      if (v !== this.vendedorSeleccionado) {
        this.vendedorSeleccionado = null;
      }
    });
    this.esVendedorControl.valueChanges.subscribe(esVendedor => this.aplicarTipoUsuario(esVendedor));
    this.aplicarTipoUsuario(this.esVendedorControl.value);
  }

  // Vendedor: se limpia y deja de exigirse el nombre manual. No vendedor: se quita el vendedor
  // elegido y el nombre pasa a ser obligatorio.
  private aplicarTipoUsuario(esVendedor: boolean): void {
    const nombre = this.form.get('nombre')!;
    if (esVendedor) {
      nombre.setValidators(Validators.maxLength(100));
      nombre.setValue('');
    } else {
      nombre.setValidators([Validators.required, Validators.maxLength(100)]);
      this.vendedorSeleccionado = null;
      this.buscadorVendedorControl.setValue('', { emitEvent: false });
    }
    nombre.updateValueAndValidity();
  }

  get faltaVendedor(): boolean {
    return this.esVendedorControl.value && !this.vendedorSeleccionado;
  }

  buscarVendedor: OperatorFunction<string, readonly VendedorDTO[]> = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      map(term => {
        const t = term.toLowerCase().trim();
        if (t.length < 2) {
          return [];
        }
        return this.vendedores
          .filter(v => v.codigo.toLowerCase().includes(t) || v.nombre.toLowerCase().includes(t))
          .slice(0, 10);
      })
    );

  formatearVendedor = (v: VendedorDTO): string => v ? `${v.codigo} - ${v.nombre}` : '';

  seleccionarVendedor(event: NgbTypeaheadSelectItemEvent<VendedorDTO>): void {
    this.vendedorSeleccionado = event.item;
  }

  generarClave(): void {
    this.form.get('password')?.setValue(this.generarClaveAleatoria());
    this.form.get('password')?.markAsDirty();
  }

  private generarClaveAleatoria(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    const valores = new Uint32Array(12);
    crypto.getRandomValues(valores);
    let clave = '';
    for (let i = 0; i < valores.length; i++) {
      clave += chars[valores[i] % chars.length];
    }
    return clave;
  }

  submit(): void {
    this.intentoGuardar = true;
    if (this.form.invalid || this.faltaVendedor) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;

    const vendedor = this.esVendedorControl.value ? this.vendedorSeleccionado : null;
    const payload: CrearUsuarioPayload = {
      username: this.form.get('username')?.value,
      email: this.form.get('email')?.value || undefined,
      codigoVendedor: vendedor?.codigo,
      tipoVendedor: vendedor?.tipo,
      password: this.form.get('password')?.value,
      nombre: vendedor ? vendedor.nombre : this.form.get('nombre')?.value?.trim()
    };

    this.usuariosService.crear(payload).subscribe({
      next: (result) => {
        this.loading = false;
        this.activeModal.close(result);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        mostrarErrorToast(err.status === 400 && err.error?.message
          ? err.error.message
          : 'No se pudo crear el usuario. Intente nuevamente.');
      }
    });
  }
}

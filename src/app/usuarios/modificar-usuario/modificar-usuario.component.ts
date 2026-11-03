import { Component, Input, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { NgbActiveModal, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { Observable, OperatorFunction, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { VendedorDTO } from 'app/mapa/models/model';
import { VendedorService } from 'app/mapa/vendedor.service';
import { UsuariosService } from '../usuarios.service';
import { ActualizarUsuarioPayload, Usuario } from '../models/model';
import { mostrarErrorToast } from '../toast.util';

@Component({
  selector: 'app-modificar-usuario',
  imports: [ReactiveFormsModule, NgbTypeahead],
  templateUrl: './modificar-usuario.component.html',
  styleUrl: './modificar-usuario.component.scss'
})
export class ModificarUsuarioComponent implements OnInit {
  @Input() usuario!: Usuario;

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
      nombre: new FormControl<string>('', Validators.maxLength(100)),
      email: new FormControl<string>(''),
      enabled: new FormControl<boolean>(true),
      locked: new FormControl<boolean>(false)
    });
  }

  ngOnInit(): void {
    this.esVendedorControl.setValue(!!this.usuario.codigoVendedor, { emitEvent: false });
    this.form.patchValue({
      nombre: this.usuario.nombre ?? '',
      email: this.usuario.email ?? '',
      enabled: this.usuario.enabled,
      locked: this.usuario.locked
    });

    this.vendedorService.getVendedores().subscribe({
      next: (vendedores) => {
        this.vendedores = vendedores;
        if (this.usuario.codigoVendedor && this.usuario.tipoVendedor) {
          const actual = vendedores.find(v =>
            v.codigo === this.usuario.codigoVendedor && v.tipo === this.usuario.tipoVendedor);
          if (actual) {
            this.vendedorSeleccionado = actual;
            this.buscadorVendedorControl.setValue(actual);
          }
        }
      },
      error: () => { mostrarErrorToast('No se pudo cargar la lista de vendedores.'); }
    });

    this.buscadorVendedorControl.valueChanges.subscribe(v => {
      if (v !== this.vendedorSeleccionado) {
        this.vendedorSeleccionado = null;
      }
    });
    this.esVendedorControl.valueChanges.subscribe(esVendedor => this.aplicarTipoUsuario(esVendedor));
    this.aplicarTipoUsuario(this.esVendedorControl.value, true);
  }

  // Vendedor: deja de exigirse el nombre manual. No vendedor: se quita el vendedor elegido y el
  // nombre pasa a ser obligatorio. inicial=true conserva los valores cargados del usuario.
  private aplicarTipoUsuario(esVendedor: boolean, inicial = false): void {
    const nombre = this.form.get('nombre')!;
    if (esVendedor) {
      nombre.setValidators(Validators.maxLength(100));
    } else {
      nombre.setValidators([Validators.required, Validators.maxLength(100)]);
      if (!inicial) {
        this.vendedorSeleccionado = null;
        this.buscadorVendedorControl.setValue('', { emitEvent: false });
      }
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

  submit(): void {
    this.intentoGuardar = true;
    if (this.form.invalid || this.faltaVendedor) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;

    const vendedor = this.esVendedorControl.value ? this.vendedorSeleccionado : null;
    const payload: ActualizarUsuarioPayload = {
      nombre: vendedor ? vendedor.nombre : this.form.get('nombre')?.value?.trim(),
      email: this.form.get('email')?.value || undefined,
      codigoVendedor: vendedor?.codigo,
      tipoVendedor: vendedor?.tipo,
      enabled: this.form.get('enabled')?.value,
      locked: this.form.get('locked')?.value
    };

    this.usuariosService.actualizar(this.usuario.id, payload).subscribe({
      next: (usuario) => {
        this.loading = false;
        this.activeModal.close(usuario);
      },
      error: (err: HttpErrorResponse) => {
        this.loading = false;
        mostrarErrorToast(err.status === 400 && err.error?.message
          ? err.error.message
          : 'No se pudo modificar el usuario. Intente nuevamente.');
      }
    });
  }
}

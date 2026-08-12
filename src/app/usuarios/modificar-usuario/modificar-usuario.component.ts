import { Component, Input, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { NgbActiveModal, NgbTypeahead, NgbTypeaheadSelectItemEvent } from '@ng-bootstrap/ng-bootstrap';
import { Observable, OperatorFunction, debounceTime, distinctUntilChanged, map } from 'rxjs';
import { VendedorDTO } from 'app/mapa/models/model';
import { VendedorService } from 'app/mapa/vendedor.service';
import { UsuariosService } from '../usuarios.service';
import { ActualizarUsuarioPayload, Usuario } from '../models/model';

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

  loading = false;
  error = '';

  constructor(
    public activeModal: NgbActiveModal,
    private usuariosService: UsuariosService,
    private vendedorService: VendedorService
  ) {
    this.form = new FormGroup({
      email: new FormControl<string>(''),
      enabled: new FormControl<boolean>(true),
      locked: new FormControl<boolean>(false)
    });
  }

  ngOnInit(): void {
    this.form.patchValue({
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
      error: () => { this.error = 'No se pudo cargar la lista de vendedores.'; }
    });

    this.buscadorVendedorControl.valueChanges.subscribe(v => {
      if (v !== this.vendedorSeleccionado) {
        this.vendedorSeleccionado = null;
      }
    });
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

  quitarVendedor(): void {
    this.vendedorSeleccionado = null;
    this.buscadorVendedorControl.setValue('');
  }

  submit(): void {
    this.loading = true;
    this.error = '';

    const payload: ActualizarUsuarioPayload = {
      email: this.form.get('email')?.value || undefined,
      codigoVendedor: this.vendedorSeleccionado?.codigo,
      tipoVendedor: this.vendedorSeleccionado?.tipo,
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
        this.error = err.status === 400 && err.error?.message
          ? err.error.message
          : 'No se pudo modificar el usuario. Intente nuevamente.';
      }
    });
  }
}

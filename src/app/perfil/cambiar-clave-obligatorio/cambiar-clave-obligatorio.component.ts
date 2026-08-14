import { Component, Input } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AuthService } from '@core';

function clavesCoincidenValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const nueva = group.get('claveNueva')?.value;
    const confirmar = group.get('confirmarClave')?.value;
    return nueva === confirmar ? null : { clavesNoCoinciden: true };
  };
}

@Component({
  selector: 'app-cambiar-clave-obligatorio',
  imports: [ReactiveFormsModule],
  templateUrl: './cambiar-clave-obligatorio.component.html',
  styleUrl: './cambiar-clave-obligatorio.component.scss',
})
export class CambiarClaveObligatorioComponent {
  @Input() claveActualForzada!: string;

  form: FormGroup;
  submitted = false;
  loading = false;
  error = '';

  constructor(public activeModal: NgbActiveModal, private authService: AuthService) {
    this.form = new FormGroup(
      {
        claveNueva: new FormControl<string>('', [Validators.required, Validators.minLength(8)]),
        confirmarClave: new FormControl<string>('', Validators.required),
      },
      { validators: clavesCoincidenValidator() },
    );
  }

  get f() {
    return this.form.controls;
  }

  cancelarYSalir(): void {
    this.authService.logout();
    // Se usa close() (no dismiss()) para que modalRef.closed en signin.component
    // dispare y navegue de vuelta al login -- es el mismo camino que sigue un
    // cambio de clave exitoso, solo que sin sesión activa.
    this.activeModal.close();
  }

  submit(): void {
    this.submitted = true;
    this.error = '';

    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.authService
      .changePassword(this.claveActualForzada, this.f['claveNueva'].value)
      .subscribe({
        next: () => {
          this.loading = false;
          this.activeModal.close();
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          this.error = err.error?.message ?? 'No se pudo cambiar la clave. Intente nuevamente.';
        },
      });
  }
}

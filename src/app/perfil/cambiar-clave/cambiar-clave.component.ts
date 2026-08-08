import { Component } from '@angular/core';
import {
  AbstractControl,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { AuthService } from '@core';

function clavesCoincidenValidator(): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const nueva = group.get('claveNueva')?.value;
    const confirmar = group.get('confirmarClave')?.value;
    return nueva === confirmar ? null : { clavesNoCoinciden: true };
  };
}

@Component({
  selector: 'app-cambiar-clave',
  templateUrl: './cambiar-clave.component.html',
  styleUrls: ['./cambiar-clave.component.scss'],
  imports: [ReactiveFormsModule],
})
export class CambiarClaveComponent {
  form: UntypedFormGroup;
  submitted = false;
  loading = false;
  error = '';
  success = '';

  constructor(private formBuilder: UntypedFormBuilder, private authService: AuthService) {
    this.form = this.formBuilder.group(
      {
        claveActual: ['', Validators.required],
        claveNueva: ['', [Validators.required, Validators.minLength(8)]],
        confirmarClave: ['', Validators.required],
      },
      { validators: clavesCoincidenValidator() },
    );
  }

  get f() {
    return this.form.controls;
  }

  onSubmit() {
    this.submitted = true;
    this.error = '';
    this.success = '';

    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.authService
      .changePassword(this.f['claveActual'].value, this.f['claveNueva'].value)
      .subscribe({
        next: () => {
          this.loading = false;
          this.success = 'Contraseña actualizada correctamente.';
          this.form.reset();
          this.submitted = false;
        },
        error: (err) => {
          this.loading = false;
          this.error =
            err.status === 401
              ? 'La clave actual es incorrecta.'
              : 'No se pudo cambiar la clave. Intente nuevamente.';
        },
      });
  }
}

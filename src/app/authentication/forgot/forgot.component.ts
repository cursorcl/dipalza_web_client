import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ReactiveFormsModule, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { AuthService } from '@core';

@Component({
  selector: 'app-forgot',
  templateUrl: './forgot.component.html',
  styleUrls: ['./forgot.component.sass'],
  imports: [ReactiveFormsModule],
})
export class ForgotComponent {
  form: UntypedFormGroup;
  submitted = false;
  loading = false;
  enviado = false;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private authService: AuthService,
    private router: Router,
  ) {
    this.form = this.formBuilder.group({
      usernameOrEmail: ['', Validators.required],
    });
  }

  get f() {
    return this.form.controls;
  }

  onSubmit() {
    this.submitted = true;
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.authService.forgotPassword(this.f['usernameOrEmail'].value).subscribe({
      next: () => {
        this.loading = false;
        // Siempre respondemos igual exista o no la cuenta -- no filtramos
        // qué usuarios/correos están registrados.
        this.enviado = true;
      },
      error: () => {
        this.loading = false;
        this.enviado = true;
      },
    });
  }
}

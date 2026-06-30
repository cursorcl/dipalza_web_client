import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FeatherModule } from 'angular-feather';
import { AuthService } from '@core';
import { ProductoService } from 'app/services/producto.service';
@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss'],
  imports: [
    FormsModule,
    ReactiveFormsModule,
    FeatherModule,
    RouterLink,
  ]
})
export class SigninComponent implements OnInit {
  loginForm!: UntypedFormGroup;
  submitted = false;
  returnUrl!: string;
  error = '';
  hide = true;
  constructor(
    private formBuilder: UntypedFormBuilder,
    private router: Router,
    private authService: AuthService,
    private productoService: ProductoService
  ) { }
  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      username: ['0076104905', Validators.required],
      password: ['Dip@lza2026', Validators.required],
      remember: [''],
    });
  }
  get f() {
    return this.loginForm.controls;
  }
  onSubmit() {
    this.submitted = true;
    this.error = '';

    if (this.loginForm.invalid) {
      this.error = 'Usuario y/o clave inválidos !';
      return;
    } else {
      this.authService
        .login(this.f['username'].value, this.f['password'].value)
        .subscribe({
          next: (res) => {
            if (res) {
              if (res) {
                const token = this.authService.currentUserValue.token;
                if (token) {
                  this.productoService.loadProductos().subscribe({
                    next: () => console.log('Productos cargados en segundo plano'),
                    error: (err) => console.error('Error cargando productos post-login', err)
                  });
                  this.router.navigate(['/']);
                }
              } else {
                this.error = 'Usuario inválido';
              }
            } else {
              this.error = 'Usuario inválido';
            }
          },
          error: (error) => {
            this.error = error.message ?? error;
            if (error.status && error.status == 403) {
              this.error = "Usuario no autorizado!!";
            }
            this.submitted = false;
          },
        });
    }
  }
}

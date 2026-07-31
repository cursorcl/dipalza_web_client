import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FeatherModule } from 'angular-feather';
import { AuthService, RememberedAccountsService, RememberedAccount } from '@core';
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
  accounts: RememberedAccount[] = [];
  constructor(
    private formBuilder: UntypedFormBuilder,
    private router: Router,
    private authService: AuthService,
    private productoService: ProductoService,
    private rememberedAccountsService: RememberedAccountsService
  ) { }
  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      remember: [''],
    });
    this.accounts = this.rememberedAccountsService.getAccounts();
  }
  get f() {
    return this.loginForm.controls;
  }
  onAccountSelected(username: string): void {
    const account = this.accounts.find(a => a.username === username);
    if (account) {
      this.loginForm.patchValue({ username: account.username, password: account.password, remember: true });
    }
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
                  if (this.f['remember'].value) {
                    this.rememberedAccountsService.saveAccount(
                      this.f['username'].value,
                      this.f['password'].value
                    );
                  }
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

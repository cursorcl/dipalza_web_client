import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FeatherModule } from 'angular-feather';
import { AuthService, RememberedAccountsService, RememberedAccount } from '@core';
import { ProductoService } from 'app/services/producto.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CambiarClaveObligatorioComponent } from 'app/perfil/cambiar-clave-obligatorio/cambiar-clave-obligatorio.component';
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
  filteredAccounts: RememberedAccount[] = [];
  showSuggestions = false;
  highlightedIndex = -1;
  constructor(
    private formBuilder: UntypedFormBuilder,
    private router: Router,
    private authService: AuthService,
    private productoService: ProductoService,
    private rememberedAccountsService: RememberedAccountsService,
    private modalService: NgbModal
  ) { }
  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      remember: [''],
    });
    this.accounts = this.rememberedAccountsService.getAccounts();

    if (this.authService.currentUserValue?.mustChangePassword) {
      this.abrirModalCambioObligatorio();
    }
  }

  // claveActualForzada solo está disponible justo tras un login exitoso (la
  // acabamos de recibir en el formulario). Si el modal se reabre al montar el
  // componente (F5, navegación hacia atrás, etc.) no tenemos la clave temporal
  // -- el usuario deberá usar "Cancelar y salir" y volver a loguearse.
  private abrirModalCambioObligatorio(claveActualForzada?: string): void {
    const modalRef = this.modalService.open(CambiarClaveObligatorioComponent, {
      backdrop: 'static',
      keyboard: false,
    });
    if (claveActualForzada) {
      modalRef.componentInstance.claveActualForzada = claveActualForzada;
    }
    modalRef.closed.subscribe(() => {
      this.authService.logout();
      this.submitted = false;
      this.router.navigate(['/authentication/signin']);
    });
  }
  get f() {
    return this.loginForm.controls;
  }
  private filterAccounts(): RememberedAccount[] {
    const valor = (this.f['username'].value ?? '').toLowerCase();
    return this.accounts.filter(a => (a.username ?? '').toLowerCase().startsWith(valor));
  }

  onUsernameFocus(): void {
    this.onUsernameInput();
  }

  onUsernameInput(): void {
    this.filteredAccounts = this.filterAccounts();
    this.showSuggestions = this.filteredAccounts.length > 0;
    this.highlightedIndex = -1;
  }

  onUsernameBlur(): void {
    this.showSuggestions = false;
    this.highlightedIndex = -1;
  }

  onUsernameKeydown(event: KeyboardEvent): void {
    if (!this.showSuggestions || this.filteredAccounts.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex = Math.min(this.highlightedIndex + 1, this.filteredAccounts.length - 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex = Math.max(this.highlightedIndex - 1, 0);
    } else if (event.key === 'Enter') {
      if (this.highlightedIndex >= 0) {
        event.preventDefault();
        this.selectAccount(this.filteredAccounts[this.highlightedIndex]);
      }
    } else if (event.key === 'Escape') {
      this.showSuggestions = false;
      this.highlightedIndex = -1;
    }
  }

  selectAccount(account: RememberedAccount): void {
    this.loginForm.patchValue({
      username: account.username,
      password: account.password,
      remember: true,
    });
    this.showSuggestions = false;
    this.highlightedIndex = -1;
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
                  if (this.authService.currentUserValue.mustChangePassword) {
                    this.abrirModalCambioObligatorio(this.f['password'].value);
                  } else {
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

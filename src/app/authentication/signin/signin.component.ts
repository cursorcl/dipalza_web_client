import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FeatherModule } from 'angular-feather';
import { AuthService } from '@core';
import { ProductoService } from 'app/services/producto.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CambiarClaveObligatorioComponent } from 'app/perfil/cambiar-clave-obligatorio/cambiar-clave-obligatorio.component';

// Clave de localStorage donde versiones anteriores guardaban "cuentas recordadas"
// con la contraseña en texto plano. Ahora el recordar cuentas lo hace el gestor de
// contraseñas del navegador (cifrado), así que al abrir el login se borra lo que
// haya quedado guardado.
const CLAVE_CUENTAS_RECORDADAS_LEGADO = 'dipalza_remembered_accounts';

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
  cargando = false;
  constructor(
    private formBuilder: UntypedFormBuilder,
    private router: Router,
    private authService: AuthService,
    private productoService: ProductoService,
    private modalService: NgbModal
  ) { }
  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
    });
    this.borrarCuentasRecordadasLegado();

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
      this.cargando = false;
      this.router.navigate(['/authentication/signin']);
    });
  }
  get f() {
    return this.loginForm.controls;
  }
  private borrarCuentasRecordadasLegado(): void {
    try {
      localStorage.removeItem(CLAVE_CUENTAS_RECORDADAS_LEGADO);
    } catch {
      // localStorage puede no estar disponible (modo privado estricto); no hay nada que borrar.
    }
  }

  // Pone el foco en el primer campo con error para que quien usa teclado o lector
  // de pantalla llegue directo a lo que falta corregir.
  private enfocarPrimerError(): void {
    const primero = ['username', 'password'].find(campo => this.f[campo].invalid);
    if (primero) {
      document.getElementById(primero)?.focus();
    }
  }

  onSubmit() {
    this.submitted = true;
    this.error = '';

    if (this.loginForm.invalid) {
      this.enfocarPrimerError();
      return;
    } else {
      this.cargando = true;
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
                    this.productoService.loadProductos().subscribe({
                      next: () => console.log('Productos cargados en segundo plano'),
                      error: (err) => console.error('Error cargando productos post-login', err)
                    });
                    this.router.navigate(['/']);
                  }
                }
              } else {
                this.error = 'Usuario inválido';
                this.cargando = false;
              }
            } else {
              this.error = 'Usuario inválido';
              this.cargando = false;
            }
          },
          error: (error) => {
            this.error = error.message ?? error;
            if (error.status && error.status == 403) {
              this.error = "Usuario no autorizado!!";
            }
            this.submitted = false;
            this.cargando = false;
          },
        });
    }
  }
}

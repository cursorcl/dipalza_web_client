# Mejoras al login web — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer que el login web recuerde hasta 5 cuentas (usuario+clave), conectar el checkbox "Recordarme" a esa lógica, agregar un selector desplegable para elegir una cuenta guardada, hacer el layout responsivo (imagen lateral y link "Olvidó su clave"), cambiar el texto del botón a "Ingresar" y habilitar visualmente los botones sociales Facebook/Instagram/X.

**Architecture:** Un nuevo servicio Angular (`RememberedAccountsService`, `providedIn: 'root'`) encapsula toda la persistencia en `localStorage` (clave `dipalza_remembered_accounts`, array JSON de `{username, password}`, máx. 5 entradas, más reciente primero). `SigninComponent` consume ese servicio para poblar un selector desplegable y para guardar la cuenta actual cuando el login es exitoso y "Recordarme" está marcado. Los cambios de layout responsivo usan únicamente utilidades de Bootstrap 5 ya presentes en el proyecto (`d-none d-md-block`, `flex-column flex-sm-row`) — sin SCSS nuevo.

**Tech Stack:** Angular 20 (standalone components, `@if`/`@for` control flow), Bootstrap 5 (grid + utilidades responsive), `angular-feather` (íconos, ya registrados globalmente vía `FeatherModule.pick(allIcons)` en `app.config.ts`), Jasmine + Karma (`npx ng test --watch=false`).

## Global Constraints

- Todo el trabajo ocurre en el repo `dipalza_web_client`, rama `feature/mejoras-login-web` (ya creada desde `origin/main`).
- La clave se persiste en `localStorage` en texto plano — riesgo aceptado explícitamente por el usuario, no se implementa cifrado.
- Sin integración OAuth real para los botones sociales — solo cambio visual/de íconos.
- El ícono de "X" usa el `twitter` de Feather (no existe logo de X en esa librería) — decisión ya confirmada por el usuario.
- No tocar `ForgotComponent`, `AuthService.login()`, ni el manejo de tokens/errores existente.
- Seguir la convención de tests ya usada en `signin.component.spec.ts`: instanciación directa (`new SigninComponent(...)`) con mocks `any` + `jasmine.createSpy`, sin `TestBed`.
- Ejecutar `npx ng test --watch=false` desde `dipalza_web_client/` para correr toda la suite (Karma abre Chrome real).

---

### Task 1: `RememberedAccountsService`

**Files:**
- Create: `src/app/core/service/remembered-accounts.service.ts`
- Create: `src/app/core/service/remembered-accounts.service.spec.ts`
- Modify: `src/app/core/index.ts`

**Interfaces:**
- Produces: `RememberedAccountsService` con `getAccounts(): RememberedAccount[]` y `saveAccount(username: string, password: string): void`. Interface `RememberedAccount { username: string; password: string }`. Ambos exportados desde `@core` para que `SigninComponent` (Task 2) los importe igual que hoy importa `AuthService`.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/core/service/remembered-accounts.service.spec.ts`:

```typescript
/// <reference types="jasmine" />
import { RememberedAccountsService } from './remembered-accounts.service';

describe('RememberedAccountsService', () => {
  let service: RememberedAccountsService;

  beforeEach(() => {
    localStorage.clear();
    service = new RememberedAccountsService();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('debería retornar una lista vacía si no hay nada guardado', () => {
    expect(service.getAccounts()).toEqual([]);
  });

  it('debería retornar una lista vacía si el valor guardado es JSON inválido', () => {
    localStorage.setItem('dipalza_remembered_accounts', 'no-es-json');
    expect(service.getAccounts()).toEqual([]);
  });

  it('debería guardar una cuenta nueva', () => {
    service.saveAccount('juan', 'clave123');
    expect(service.getAccounts()).toEqual([{ username: 'juan', password: 'clave123' }]);
  });

  it('debería mover una cuenta existente al frente y actualizar su clave', () => {
    service.saveAccount('juan', 'clave123');
    service.saveAccount('maria', 'otraClave');
    service.saveAccount('juan', 'claveNueva');

    expect(service.getAccounts()).toEqual([
      { username: 'juan', password: 'claveNueva' },
      { username: 'maria', password: 'otraClave' },
    ]);
  });

  it('debería mantener como máximo 5 cuentas, descartando la más antigua', () => {
    service.saveAccount('user1', 'p1');
    service.saveAccount('user2', 'p2');
    service.saveAccount('user3', 'p3');
    service.saveAccount('user4', 'p4');
    service.saveAccount('user5', 'p5');
    service.saveAccount('user6', 'p6');

    const accounts = service.getAccounts();
    expect(accounts.length).toBe(5);
    expect(accounts.map(a => a.username)).toEqual(['user6', 'user5', 'user4', 'user3', 'user2']);
    expect(accounts.find(a => a.username === 'user1')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npx ng test --watch=false`
Expected: FAIL — `Cannot find module './remembered-accounts.service'` (el archivo de implementación todavía no existe).

- [ ] **Step 3: Implementar el servicio**

Crear `src/app/core/service/remembered-accounts.service.ts`:

```typescript
import { Injectable } from '@angular/core';

export interface RememberedAccount {
  username: string;
  password: string;
}

const STORAGE_KEY = 'dipalza_remembered_accounts';
const MAX_ACCOUNTS = 5;

@Injectable({
  providedIn: 'root',
})
export class RememberedAccountsService {
  getAccounts(): RememberedAccount[] {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  saveAccount(username: string, password: string): void {
    const accounts = this.getAccounts().filter(a => a.username !== username);
    accounts.unshift({ username, password });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.slice(0, MAX_ACCOUNTS)));
  }
}
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

Run: `npx ng test --watch=false`
Expected: PASS — los 5 tests de `RememberedAccountsService` en verde.

- [ ] **Step 5: Exportar desde el barrel `@core`**

Modificar `src/app/core/index.ts`, agregando al final del bloque de servicios (después de la línea `export { RightSidebarService } from './service/rightsidebar.service';`):

```typescript
export { RememberedAccountsService } from './service/remembered-accounts.service';
export type { RememberedAccount } from './service/remembered-accounts.service';
```

- [ ] **Step 6: Commit**

```bash
git add src/app/core/service/remembered-accounts.service.ts src/app/core/service/remembered-accounts.service.spec.ts src/app/core/index.ts
git commit -m "feat: agrega RememberedAccountsService para recordar hasta 5 cuentas de login"
```

---

### Task 2: Lógica de `SigninComponent` — defaults vacíos, cuentas recordadas y guardado en "Recordarme"

**Files:**
- Modify: `src/app/authentication/signin/signin.component.ts`
- Modify: `src/app/authentication/signin/signin.component.spec.ts`

**Interfaces:**
- Consume: `RememberedAccountsService.getAccounts()` y `.saveAccount(username, password)` (Task 1).
- Produces: `SigninComponent.accounts: RememberedAccount[]` (leído por el template en Task 3) y `SigninComponent.onAccountSelected(username: string): void` (invocado desde el `<select>` en Task 3).

- [ ] **Step 1: Modificar el spec para reflejar el nuevo comportamiento (esto lo va a dejar en rojo)**

En `src/app/authentication/signin/signin.component.spec.ts`:

a) Agregar el import del tipo junto a los existentes (línea 4):

```typescript
import { AuthService, RememberedAccountsService } from '@core';
```

b) En el bloque de variables (después de `let productoServiceMock: any;`, línea 14), agregar:

```typescript
  let rememberedAccountsServiceMock: any;
```

c) Dentro de `beforeEach` (después del bloque de `productoServiceMock`, línea 28), agregar:

```typescript
    rememberedAccountsServiceMock = {
      getAccounts: jasmine.createSpy('getAccounts').and.returnValue([]),
      saveAccount: jasmine.createSpy('saveAccount')
    };
```

d) Actualizar la instanciación del componente (línea 32-37) para pasar el nuevo mock:

```typescript
    component = new SigninComponent(
      formBuilder,
      routerMock,
      authServiceMock as AuthService,
      productoServiceMock as ProductoService,
      rememberedAccountsServiceMock as RememberedAccountsService
    );
```

e) Cambiar las dos aserciones de valores por defecto (líneas 48-49) de credenciales hardcodeadas a vacías:

```typescript
      expect(component.loginForm.get('username')?.value).toBe('');
      expect(component.loginForm.get('password')?.value).toBe('');
```

f) Agregar un nuevo `describe` después del bloque `describe('ngOnInit', ...)` (antes de `describe('onSubmit', ...)`):

```typescript
  describe('cuentas recordadas', () => {
    it('debería exponer las cuentas guardadas al inicializar', () => {
      rememberedAccountsServiceMock.getAccounts.and.returnValue([
        { username: 'juan', password: 'clave123' },
      ]);
      component.ngOnInit();
      expect(component.accounts).toEqual([{ username: 'juan', password: 'clave123' }]);
    });

    it('onAccountSelected debería precargar usuario y clave de la cuenta elegida', () => {
      rememberedAccountsServiceMock.getAccounts.and.returnValue([
        { username: 'juan', password: 'clave123' },
      ]);
      component.ngOnInit();
      component.onAccountSelected('juan');
      expect(component.loginForm.get('username')?.value).toBe('juan');
      expect(component.loginForm.get('password')?.value).toBe('clave123');
    });

    it('onAccountSelected no debería modificar el formulario si el username no existe', () => {
      component.ngOnInit();
      component.loginForm.setValue({ username: 'x', password: 'y', remember: '' });
      component.onAccountSelected('inexistente');
      expect(component.loginForm.get('username')?.value).toBe('x');
      expect(component.loginForm.get('password')?.value).toBe('y');
    });
  });
```

g) Dentro del `describe('onSubmit', ...)` existente, agregar dos tests nuevos al final (después de `it('debería resetear submitted=false tras error', ...)`, antes del cierre del `describe`):

```typescript
    it('debería guardar la cuenta si "recordarme" está marcado tras login exitoso', () => {
      component.ngOnInit();
      component.loginForm.get('username')?.setValue('testuser');
      component.loginForm.get('password')?.setValue('testpass');
      component.loginForm.get('remember')?.setValue(true);
      component.onSubmit();
      expect(rememberedAccountsServiceMock.saveAccount).toHaveBeenCalledWith('testuser', 'testpass');
    });

    it('no debería guardar la cuenta si "recordarme" no está marcado', () => {
      component.ngOnInit();
      component.loginForm.get('username')?.setValue('testuser');
      component.loginForm.get('password')?.setValue('testpass');
      component.loginForm.get('remember')?.setValue(false);
      component.onSubmit();
      expect(rememberedAccountsServiceMock.saveAccount).not.toHaveBeenCalled();
    });
```

- [ ] **Step 2: Correr los tests y confirmar que fallan**

Run: `npx ng test --watch=false`
Expected: FAIL — error de compilación (`Expected 4 arguments, but got 5`) más los tests de valores por defecto en `''`, ya que `SigninComponent` todavía no acepta el 5º parámetro ni expone `accounts`/`onAccountSelected`.

- [ ] **Step 3: Implementar los cambios en el componente**

En `src/app/authentication/signin/signin.component.ts`:

a) Cambiar el import de la línea 5:

```typescript
import { AuthService, RememberedAccountsService, RememberedAccount } from '@core';
```

b) Agregar el campo `accounts` junto a las propiedades existentes (después de `hide = true;`, línea 23):

```typescript
  accounts: RememberedAccount[] = [];
```

c) Agregar el nuevo parámetro al constructor (líneas 24-29):

```typescript
  constructor(
    private formBuilder: UntypedFormBuilder,
    private router: Router,
    private authService: AuthService,
    private productoService: ProductoService,
    private rememberedAccountsService: RememberedAccountsService
  ) { }
```

d) Reemplazar `ngOnInit()` (líneas 30-36) para usar defaults vacíos y exponer las cuentas:

```typescript
  ngOnInit() {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      remember: [''],
    });
    this.accounts = this.rememberedAccountsService.getAccounts();
  }
```

e) Agregar el nuevo método después de `get f()` (línea 37-39):

```typescript
  onAccountSelected(username: string): void {
    const account = this.accounts.find(a => a.username === username);
    if (account) {
      this.loginForm.patchValue({ username: account.username, password: account.password });
    }
  }
```

f) En `onSubmit()`, dentro del bloque `if (token) { ... }` (línea 55-61), guardar la cuenta antes de navegar:

```typescript
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
```

- [ ] **Step 4: Correr los tests y confirmar que pasan**

Run: `npx ng test --watch=false`
Expected: PASS — toda la suite de `SigninComponent`, incluyendo los tests nuevos, en verde.

- [ ] **Step 5: Commit**

```bash
git add src/app/authentication/signin/signin.component.ts src/app/authentication/signin/signin.component.spec.ts
git commit -m "feat: SigninComponent recuerda cuentas y conecta el checkbox recordarme"
```

---

### Task 3: Template — selector de cuentas, texto del botón, layout responsivo y botones sociales

**Files:**
- Modify: `src/app/authentication/signin/signin.component.html`

**Interfaces:**
- Consume: `accounts: RememberedAccount[]` y `onAccountSelected(username: string): void` de `SigninComponent` (Task 2).

- [ ] **Step 1: Ocultar la imagen lateral en pantallas angostas en vez de apilarla**

En `signin.component.html`, reemplazar las líneas 5-8:

```html
        <div class="col-md-5">
          <img src="assets/images/login.jpg" alt="login" class="login-card-img">
          </div>
          <div class="col-md-7">
```

por:

```html
        <div class="col-md-5 d-none d-md-block">
          <img src="assets/images/login.jpg" alt="login" class="login-card-img">
          </div>
          <div class="col-12 col-md-7">
```

- [ ] **Step 2: Agregar el selector desplegable de cuentas guardadas**

Insertar el siguiente bloque nuevo justo después de la línea `<div class="row">` (línea 16) y antes del `<div class="col-lg-12">` del campo "Cuenta" (línea 17):

```html
                  @if (accounts.length > 0) {
                    <div class="col-lg-12">
                      <div class="form-group">
                        <label for="accountSelect">Cuentas guardadas</label>
                        <select id="accountSelect" class="form-select" (change)="onAccountSelected($any($event.target).value)">
                          <option value="" selected disabled>Seleccione una cuenta guardada</option>
                          @for (account of accounts; track account.username) {
                            <option [value]="account.username">{{ account.username }}</option>
                          }
                        </select>
                      </div>
                    </div>
                  }
```

- [ ] **Step 3: Que "Olvidó su clave" pase a línea propia en pantallas angostas**

Reemplazar la línea 33:

```html
                        <div class="d-flex justify-content-between">
```

por:

```html
                        <div class="d-flex flex-column flex-sm-row justify-content-sm-between">
```

- [ ] **Step 4: Cambiar el texto del botón a "Ingresar"**

Reemplazar la línea 50:

```html
                          <button class="btn btn-primary auth-form-btn">Sign in</button>
```

por:

```html
                          <button class="btn btn-primary auth-form-btn">Ingresar</button>
```

- [ ] **Step 5: Reemplazar los botones sociales por Facebook, Instagram y X**

Reemplazar las líneas 54-67 (el `<ul class="list-unstyled social-icon mb-0 mt-3">` completo con sus 4 `<li>`) por:

```html
                          <ul class="list-unstyled social-icon mb-0 mt-3">
                            <li class="list-inline-item"><a href="javascript:void(0)" class="rounded">
                              <i-feather name="facebook" class="fea-social sm-icon"></i-feather>
                            </a></li>
                            <li class="list-inline-item"><a href="javascript:void(0)" class="rounded">
                              <i-feather name="instagram" class="fea-social sm-icon"></i-feather>
                            </a></li>
                            <li class="list-inline-item"><a href="javascript:void(0)" class="rounded">
                              <i-feather name="twitter" class="fea-social sm-icon"></i-feather>
                            </a></li>
                          </ul>
```

- [ ] **Step 6: Verificación manual en el navegador**

Run: `npx ng serve` (desde `dipalza_web_client/`), abrir `http://localhost:4200/authentication/signin`.

Con las DevTools abiertas y `localStorage` vacío (`localStorage.clear()` en la consola, luego recargar), confirmar:
- Los campos "Cuenta" y "Clave" arrancan vacíos, sin selector de cuentas guardadas visible.
- El botón dice "Ingresar".
- Los 3 íconos sociales muestran Facebook, Instagram y el pájaro de Twitter (placeholder de X), sin acción al hacer click.
- Con la ventana ancha (>768px): se ve la imagen a la izquierda del formulario.
- Angostando la ventana por debajo de 768px: la imagen desaparece por completo (no se apila arriba del formulario) y el formulario ocupa el 100% del ancho.
- Angostando por debajo de 576px: el checkbox "Recordame" y el link "Olvidó su clave ?" quedan en líneas separadas (checkbox arriba, link abajo) en vez de compartir la misma fila.
- Hacer login exitoso con "Recordarme" marcado, recargar la página: debe aparecer el selector "Cuentas guardadas" con esa cuenta; al elegirla, se precargan usuario y clave.
- Hacer login exitoso con "Recordarme" **desmarcado** usando una cuenta nueva, recargar: esa cuenta NO debe aparecer en el selector.

- [ ] **Step 7: Commit**

```bash
git add src/app/authentication/signin/signin.component.html
git commit -m "feat: layout responsivo, selector de cuentas y botones sociales en el login"
```

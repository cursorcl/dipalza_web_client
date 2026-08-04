# Autocompletado de cuentas guardadas en el login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el `<select>` "Cuentas guardadas" del login (`SigninComponent`) por sugerencias de autocompletado directamente sobre el input "Cuenta", con soporte de mouse y teclado.

**Architecture:** Todo el cambio vive en `src/app/authentication/signin/` (dos archivos: `signin.component.ts` y `signin.component.html`). El componente ya inyecta `RememberedAccountsService` y expone `accounts: RememberedAccount[]` — eso no cambia. Se agrega estado derivado (`filteredAccounts`, `showSuggestions`, `highlightedIndex`) y manejadores de eventos (`focus`/`input`/`keydown`/`blur` en el input, `click`/`mousedown` en cada sugerencia) que reemplazan al único manejador `(change)` del `<select>` anterior.

**Tech Stack:** Angular 20 (standalone component, reactive forms), Bootstrap 5 (`dropdown-menu`/`dropdown-item` para el estilo de la lista, sin CSS a medida), Jasmine (specs sin `TestBed`, instanciación directa del componente — patrón ya usado en `signin.component.spec.ts`).

## Global Constraints

- Sin librerías nuevas (spec: "Sin librerías nuevas — se reutilizan las clases `dropdown-menu`/`dropdown-item` de Bootstrap 5").
- `RememberedAccountsService`, el guardado de cuentas en `onSubmit()`, y el resto del formulario (clave, submit, "Olvidó su clave", checkbox "Recordarme") no cambian (spec, sección "Qué NO cambia").
- Filtrado: `accounts.filter(a => a.username.toLowerCase().startsWith(valor.toLowerCase()))`; si `valor === ''`, pasan todas las `accounts`.
- `Enter` solo intercepta el submit del formulario cuando hay una sugerencia resaltada (`highlightedIndex >= 0`); si no, el submit normal debe seguir funcionando.
- Convención del proyecto: nomenclatura en español para nombres de variables/métodos nuevos que sean específicos del dominio de negocio; los nombres de este plan (`onUsernameFocus`, `filteredAccounts`, etc.) siguen el inglés ya usado en el resto de `signin.component.ts` (`loginForm`, `onSubmit`, `accounts`) — no se introduce una convención nueva.

---

### Task 1: Lógica de autocompletado en `signin.component.ts`

**Files:**
- Modify: `src/app/authentication/signin/signin.component.ts`
- Test: `src/app/authentication/signin/signin.component.spec.ts`

**Interfaces:**
- Consumes: `RememberedAccount { username: string; password: string }` (de `@core`, ya importado); `this.accounts: RememberedAccount[]` (ya existe, poblado en `ngOnInit`); `this.loginForm` (`UntypedFormGroup` ya existente con controles `username`, `password`, `remember`).
- Produces (usado por Task 2 en el template):
  - `filteredAccounts: RememberedAccount[]`
  - `showSuggestions: boolean`
  - `highlightedIndex: number`
  - `onUsernameFocus(): void`
  - `onUsernameInput(): void`
  - `onUsernameKeydown(event: KeyboardEvent): void`
  - `selectAccount(account: RememberedAccount): void`
  - `onUsernameBlur(): void`

- [ ] **Step 1: Escribir los tests que fallan para el filtrado y la selección**

Reemplaza el bloque `describe('cuentas recordadas', ...)` completo (líneas 81-108 de `signin.component.spec.ts`, que testea el `onAccountSelected` del combobox viejo) por:

```typescript
  describe('cuentas recordadas', () => {
    beforeEach(() => {
      rememberedAccountsServiceMock.getAccounts.and.returnValue([
        { username: 'juan', password: 'clave123' },
        { username: 'juana', password: 'clave456' },
        { username: 'pedro', password: 'clave789' },
      ]);
      component.ngOnInit();
    });

    it('debería exponer las cuentas guardadas al inicializar', () => {
      expect(component.accounts.length).toBe(3);
    });

    describe('onUsernameFocus', () => {
      it('debería mostrar todas las cuentas si el input está vacío', () => {
        component.onUsernameFocus();
        expect(component.filteredAccounts.length).toBe(3);
        expect(component.showSuggestions).toBeTrue();
      });

      it('debería resetear highlightedIndex a -1', () => {
        component.highlightedIndex = 2;
        component.onUsernameFocus();
        expect(component.highlightedIndex).toBe(-1);
      });
    });

    describe('onUsernameInput', () => {
      it('debería filtrar cuentas por prefijo del username (case-insensitive)', () => {
        component.loginForm.get('username')?.setValue('JU');
        component.onUsernameInput();
        expect(component.filteredAccounts).toEqual([
          { username: 'juan', password: 'clave123' },
          { username: 'juana', password: 'clave456' },
        ]);
        expect(component.showSuggestions).toBeTrue();
      });

      it('debería ocultar la lista si no hay coincidencias', () => {
        component.loginForm.get('username')?.setValue('zzz');
        component.onUsernameInput();
        expect(component.filteredAccounts).toEqual([]);
        expect(component.showSuggestions).toBeFalse();
      });

      it('debería mostrar todas las cuentas si el input queda vacío', () => {
        component.loginForm.get('username')?.setValue('');
        component.onUsernameInput();
        expect(component.filteredAccounts.length).toBe(3);
      });
    });

    describe('selectAccount', () => {
      it('debería precargar usuario, clave y marcar remember', () => {
        component.selectAccount({ username: 'juan', password: 'clave123' });
        expect(component.loginForm.get('username')?.value).toBe('juan');
        expect(component.loginForm.get('password')?.value).toBe('clave123');
        expect(component.loginForm.get('remember')?.value).toBe(true);
      });

      it('debería cerrar la lista de sugerencias', () => {
        component.showSuggestions = true;
        component.highlightedIndex = 1;
        component.selectAccount({ username: 'juan', password: 'clave123' });
        expect(component.showSuggestions).toBeFalse();
        expect(component.highlightedIndex).toBe(-1);
      });
    });

    describe('onUsernameBlur', () => {
      it('debería cerrar la lista de sugerencias', () => {
        component.showSuggestions = true;
        component.highlightedIndex = 1;
        component.onUsernameBlur();
        expect(component.showSuggestions).toBeFalse();
        expect(component.highlightedIndex).toBe(-1);
      });
    });

    describe('onUsernameKeydown', () => {
      function keyEvent(key: string): KeyboardEvent {
        return new KeyboardEvent('keydown', { key });
      }

      beforeEach(() => {
        component.onUsernameFocus();
      });

      it('ArrowDown debería avanzar highlightedIndex sin pasar del último elemento', () => {
        component.onUsernameKeydown(keyEvent('ArrowDown'));
        expect(component.highlightedIndex).toBe(0);
        component.onUsernameKeydown(keyEvent('ArrowDown'));
        component.onUsernameKeydown(keyEvent('ArrowDown'));
        component.onUsernameKeydown(keyEvent('ArrowDown'));
        expect(component.highlightedIndex).toBe(2);
      });

      it('ArrowUp debería retroceder highlightedIndex sin bajar de 0', () => {
        component.highlightedIndex = 1;
        component.onUsernameKeydown(keyEvent('ArrowUp'));
        expect(component.highlightedIndex).toBe(0);
        component.onUsernameKeydown(keyEvent('ArrowUp'));
        expect(component.highlightedIndex).toBe(0);
      });

      it('Enter con una sugerencia resaltada debería seleccionarla y no enviar el formulario', () => {
        component.highlightedIndex = 1;
        const event = keyEvent('Enter');
        spyOn(event, 'preventDefault');
        component.onUsernameKeydown(event);
        expect(event.preventDefault).toHaveBeenCalled();
        expect(component.loginForm.get('username')?.value).toBe('juana');
      });

      it('Enter sin sugerencia resaltada no debería interceptar el evento', () => {
        component.highlightedIndex = -1;
        const event = keyEvent('Enter');
        spyOn(event, 'preventDefault');
        component.onUsernameKeydown(event);
        expect(event.preventDefault).not.toHaveBeenCalled();
      });

      it('Escape debería cerrar la lista sin seleccionar', () => {
        component.highlightedIndex = 1;
        component.onUsernameKeydown(keyEvent('Escape'));
        expect(component.showSuggestions).toBeFalse();
        expect(component.highlightedIndex).toBe(-1);
        expect(component.loginForm.get('username')?.value).toBe('');
      });

      it('no debería hacer nada si showSuggestions es false', () => {
        component.showSuggestions = false;
        component.onUsernameKeydown(keyEvent('ArrowDown'));
        expect(component.highlightedIndex).toBe(-1);
      });
    });
  });
```

- [ ] **Step 2: Correr los tests y verificar que fallan**

Run: `npx ng test --include='src/app/authentication/signin/signin.component.spec.ts' --watch=false`
Expected: FAIL — `onUsernameFocus`, `onUsernameInput`, `onUsernameKeydown`, `selectAccount`, `onUsernameBlur`, `filteredAccounts`, `showSuggestions`, `highlightedIndex` no existen todavía en `SigninComponent` (errores de compilación TS o `is not a function`).

- [ ] **Step 3: Implementar la lógica en `signin.component.ts`**

En `src/app/authentication/signin/signin.component.ts`, elimina el método `onAccountSelected` (líneas 43-48 actuales) y reemplázalo, junto con las nuevas propiedades de estado, así:

```typescript
  accounts: RememberedAccount[] = [];
  filteredAccounts: RememberedAccount[] = [];
  showSuggestions = false;
  highlightedIndex = -1;
```

(agrega las tres propiedades nuevas justo debajo de la declaración existente de `accounts: RememberedAccount[] = [];`)

Reemplaza el método `onAccountSelected` por:

```typescript
  private filtrarCuentas(): RememberedAccount[] {
    const valor = (this.f['username'].value ?? '').toLowerCase();
    return this.accounts.filter(a => a.username.toLowerCase().startsWith(valor));
  }

  onUsernameFocus(): void {
    this.filteredAccounts = this.filtrarCuentas();
    this.showSuggestions = this.filteredAccounts.length > 0;
    this.highlightedIndex = -1;
  }

  onUsernameInput(): void {
    this.filteredAccounts = this.filtrarCuentas();
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
```

- [ ] **Step 4: Correr los tests y verificar que pasan**

Run: `npx ng test --include='src/app/authentication/signin/signin.component.spec.ts' --watch=false`
Expected: PASS (todos los tests del describe `cuentas recordadas`, más el resto de la suite existente sin regresiones).

- [ ] **Step 5: Commit**

```bash
git add src/app/authentication/signin/signin.component.ts src/app/authentication/signin/signin.component.spec.ts
git commit -m "feat: autocompletado de cuentas guardadas sobre el input de login

Reemplaza onAccountSelected (usado por el combobox) por filtrado en
vivo + navegación por teclado, base para el nuevo autocompletado del
input de cuenta."
```

---

### Task 2: Template — mover el autocompletado al input "Cuenta"

**Files:**
- Modify: `src/app/authentication/signin/signin.component.html`

**Interfaces:**
- Consumes (de Task 1): `filteredAccounts: RememberedAccount[]`, `showSuggestions: boolean`, `highlightedIndex: number`, `onUsernameFocus()`, `onUsernameInput()`, `onUsernameKeydown($event)`, `onUsernameBlur()`, `selectAccount(account)`.
- Produces: nada (última tarea del plan).

No hay test unitario de plantilla en este proyecto para `signin.component` (la spec existente instancia el componente directamente, sin `TestBed`/`fixture` — no se introduce ese patrón nuevo aquí). La verificación de este paso es manual, con la app corriendo.

- [ ] **Step 1: Eliminar el `<select>` de "Cuentas guardadas"**

En `src/app/authentication/signin/signin.component.html`, elimina por completo el bloque (líneas 17-29 actuales):

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

- [ ] **Step 2: Agregar los eventos y el dropdown de sugerencias sobre el input "Cuenta"**

Inmediatamente después, el bloque del input "Cuenta" (líneas 30-36 actuales) queda:

```html
                  <div class="col-lg-12">
                    <div class="form-group position-relative">
                      <label>Cuenta <span class="text-danger">*</span></label>
                      <i-feather name="user" class="login-icons"></i-feather>
                      <input type="email" class="form-control psl-5" formControlName="username" placeholder="Email"
                        autocomplete="off"
                        (focus)="onUsernameFocus()"
                        (input)="onUsernameInput()"
                        (keydown)="onUsernameKeydown($event)"
                        (blur)="onUsernameBlur()">
                      @if (showSuggestions) {
                        <ul class="dropdown-menu show w-100">
                          @for (account of filteredAccounts; track account.username; let i = $index) {
                            <li>
                              <button type="button" class="dropdown-item"
                                [class.active]="highlightedIndex === i"
                                (mousedown)="$event.preventDefault()"
                                (click)="selectAccount(account)">
                                {{ account.username }}
                              </button>
                            </li>
                          }
                        </ul>
                      }
                    </div>
                  </div>
```

- [ ] **Step 3: Verificar que el build compila sin errores**

Run: `npx ng build`
Expected: build exitoso, sin errores de template (bindings a propiedades/métodos inexistentes se detectan en tiempo de compilación en Angular con `strictTemplates`).

- [ ] **Step 4: Verificación manual en el navegador**

Run: `npm start` y abre `http://localhost:4200/authentication/signin`.

Con al menos 2 cuentas guardadas en `localStorage` bajo la clave `dipalza_remembered_accounts` (puedes setearlas desde la consola del navegador: `localStorage.setItem('dipalza_remembered_accounts', JSON.stringify([{username:'juan',password:'clave123'},{username:'juana',password:'clave456'}]))` y recargar), verificar:
- Al hacer foco en el input "Cuenta" (vacío) aparece la lista con ambas cuentas.
- Al escribir "ju" se siguen mostrando ambas; al escribir "juan" (sin la 'a' final) o clic afuera, se filtra a solo "juan"; al escribir "zzz" la lista desaparece.
- Click en una sugerencia autocompleta usuario + clave y marca "Recordarme"; la lista se cierra.
- Con la lista abierta, `↓`/`↑` resaltan visualmente cada opción (clase `active` de Bootstrap); `Enter` sobre una opción resaltada la selecciona y NO envía el formulario (la URL no cambia ni aparece error de credenciales inválidas por submit accidental); `Escape` cierra la lista sin cambiar el input.
- Sin ninguna cuenta guardada (`localStorage.removeItem('dipalza_remembered_accounts')` + recargar), el foco en el input no muestra ninguna lista y el resto del login funciona igual que antes.

- [ ] **Step 5: Commit**

```bash
git add src/app/authentication/signin/signin.component.html
git commit -m "feat: reemplaza combobox de cuentas guardadas por autocompletado en el input"
```

---

## Spec Coverage Check

- Objetivo 1 (eliminar `<select>`) → Task 2, Step 1.
- Objetivo 2 (mostrar sugerencias al enfocar/escribir, filtrado por prefijo) → Task 1 (`onUsernameFocus`, `onUsernameInput`, `filtrarCuentas`) + Task 2, Step 2.
- Objetivo 3 (selección autocompleta usuario+clave+remember) → Task 1 (`selectAccount`) + Task 2, Step 2.
- Objetivo 4 (navegación por teclado ↓/↑/Enter/Escape) → Task 1 (`onUsernameKeydown`) + Task 2, Step 4 (verificación manual).
- Objetivo 5 (sin librerías nuevas, clases Bootstrap existentes) → Task 2, Step 2 (`dropdown-menu`/`dropdown-item`, sin imports nuevos).
- "Qué NO cambia" del spec → ningún task toca `RememberedAccountsService`, `onSubmit`, ni el resto del formulario.

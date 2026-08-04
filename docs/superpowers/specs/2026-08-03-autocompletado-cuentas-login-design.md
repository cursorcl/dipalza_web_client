# Autocompletado de cuentas guardadas en el login

## Contexto

El PR #9 ([[2026-07-30-mejoras-login-design.md]]) agregó `RememberedAccountsService` (hasta 5 cuentas usuario+clave en `localStorage`, clave `dipalza_remembered_accounts`) y, en `SigninComponent`, un `<select>` Bootstrap ("Cuentas guardadas") ubicado *sobre* el input "Cuenta", visible solo con `accounts.length > 0`. Al elegir una opción, `onAccountSelected(username)` hace `patchValue` de usuario/clave en `loginForm`.

El usuario no quiere ese combobox separado: prefiere que las cuentas guardadas se sugieran directamente sobre el mismo input "Cuenta", con autocompletado (como una lista desplegable estilo Bootstrap que aparece bajo el campo mientras se escribe o al enfocarlo).

## Objetivo

1. Eliminar el `<select>` "Cuentas guardadas" y su fila del formulario.
2. Al enfocar el input "Cuenta" (esté vacío o no) o al escribir en él, mostrar debajo una lista de cuentas guardadas cuyo `username` empieza con lo escrito (si el input está vacío, se muestran las 5 cuentas guardadas completas).
3. Al elegir una cuenta de la lista (clic/tap o teclado): autocompletar usuario y clave en `loginForm`, y marcar el checkbox "Recordarme" — mismo comportamiento que el `onAccountSelected` actual.
4. Soportar navegación por teclado: `↓`/`↑` mueven el resaltado entre las sugerencias visibles, `Enter` selecciona la resaltada (sin enviar el formulario), `Escape` cierra la lista sin seleccionar.
5. Sin librerías nuevas — se reutilizan las clases `dropdown-menu`/`dropdown-item` de Bootstrap 5 (ya en el proyecto) para el estilo de la lista.

## Enfoque

### Cambios en `signin.component.ts`

- Se elimina `onAccountSelected(username: string)`.
- Nuevo estado del componente:
  - `filteredAccounts: RememberedAccount[] = []`
  - `showSuggestions = false`
  - `highlightedIndex = -1` (`-1` = ninguna sugerencia resaltada)
- `onUsernameFocus()`: recalcula `filteredAccounts` a partir de `accounts` filtrando por el valor actual del control `username` (ver regla de filtrado abajo); `showSuggestions = filteredAccounts.length > 0`; `highlightedIndex = -1`.
- `onUsernameInput()`: misma lógica de recálculo que `onUsernameFocus()` (se dispara en cada tecleo).
- Regla de filtrado (compartida por ambos métodos): `accounts.filter(a => a.username.toLowerCase().startsWith(valor.toLowerCase()))`, donde `valor` es el valor actual del control `username`. Si `valor` es `''`, todas las `accounts` pasan el filtro (paridad con el combobox actual, que mostraba las 5 cuentas sin filtrar).
- `onUsernameKeydown(event: KeyboardEvent)`:
  - Si `showSuggestions` es `false` o `filteredAccounts.length === 0`, no hace nada.
  - `ArrowDown`: `event.preventDefault()`; `highlightedIndex = Math.min(highlightedIndex + 1, filteredAccounts.length - 1)`.
  - `ArrowUp`: `event.preventDefault()`; `highlightedIndex = Math.max(highlightedIndex - 1, 0)`.
  - `Enter`: si `highlightedIndex >= 0`, `event.preventDefault()` y llama a `selectAccount(filteredAccounts[highlightedIndex])` (evita el submit del formulario). Si `highlightedIndex === -1`, no intercepta — el `Enter` sigue su comportamiento normal (enviar formulario).
  - `Escape`: `showSuggestions = false; highlightedIndex = -1`.
- `selectAccount(account: RememberedAccount)`: `loginForm.patchValue({ username: account.username, password: account.password, remember: true })`; `showSuggestions = false`; `highlightedIndex = -1`.
- `onUsernameBlur()`: `showSuggestions = false; highlightedIndex = -1`. Se apoya en que los ítems de la lista cancelan su propio `blur` (ver template) para que el clic en una sugerencia no se pierda.

### Cambios en `signin.component.html`

- Se elimina por completo el bloque `@if (accounts.length > 0) { <div class="col-lg-12">...<select>...</div> }`.
- El input de "Cuenta" (dentro de `form-group position-relative`, que ya existe) gana:
  - `(focus)="onUsernameFocus()"`
  - `(input)="onUsernameInput()"`
  - `(keydown)="onUsernameKeydown($event)"`
  - `(blur)="onUsernameBlur()"`
  - `autocomplete="off"` (evita que el autocompletado nativo del navegador se superponga con el nuestro)
- Justo después del `<input>`, dentro del mismo `form-group`, se agrega:
  ```html
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
  ```
  - `(mousedown)="$event.preventDefault()"` evita que el input pierda el foco (y por lo tanto que `onUsernameBlur()` cierre la lista) antes de que el `(click)` del botón se procese — patrón estándar para combinar listas de sugerencias con eventos de blur.
  - `w-100` asegura que la lista tenga el mismo ancho que el input (el `form-group` padre ya es `position-relative`, por lo que `dropdown-menu` se posiciona respecto a él sin CSS adicional).

### Qué NO cambia

- `RememberedAccountsService` no se toca — sigue guardando/leyendo hasta 5 cuentas en `localStorage`.
- El guardado de cuentas en `onSubmit()` (llamada a `saveAccount` cuando `remember` está marcado tras login exitoso) no cambia.
- El checkbox "Recordarme" y el resto del formulario (clave, submit, "Olvidó su clave") no cambian.

## Pruebas

En `signin.component.spec.ts`:
- Se elimina el test existente de `onAccountSelected` vía combobox.
- Se agregan casos para:
  - `onUsernameFocus()` / `onUsernameInput()`: filtrado correcto (coincidencia por `startsWith`, insensible a mayúsculas, lista completa cuando el input está vacío).
  - `selectAccount()`: autocompleta usuario, clave y marca `remember`; cierra la lista.
  - `onUsernameKeydown()`: `ArrowDown`/`ArrowUp` mueven `highlightedIndex` dentro de los límites (no se sale del arreglo); `Enter` con `highlightedIndex >= 0` selecciona la cuenta y no dispara submit; `Enter` con `highlightedIndex === -1` no intercepta; `Escape` cierra la lista sin seleccionar.

## Fuera de alcance

- Borrado individual de cuentas guardadas desde la lista de sugerencias (no fue pedido; ya estaba fuera de alcance en el PR #9 original).
- Resaltar en negrita la porción del texto que coincide con lo escrito (nice-to-have visual, no pedido).
- Sincronizar este cambio hacia `dipalza_server` (frontend embebido) — eso ocurre en el proceso de release habitual, no es parte de este spec.

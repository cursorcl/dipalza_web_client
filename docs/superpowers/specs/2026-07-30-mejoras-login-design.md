# Mejoras a la ventana de login

## Contexto

El login web (`src/app/authentication/signin/`) es un `SigninComponent` standalone de Angular 20, con layout Bootstrap 5 (`row.no-gutters` con `col-md-5` para una imagen decorativa y `col-md-7` para el formulario). El componente ya tiene, aunque sin funcionalidad real:

- Un checkbox "Recordame" (`formControlName="remember"`) que nunca se lee en `onSubmit()`.
- Un link "Olvidó su clave ?" que navega a `ForgotComponent`, el cual es hoy un shell sin lógica (fuera de alcance de este spec).
- Cuatro botones sociales (Facebook, GitHub, Twitter, GitLab) como `<a href="javascript:void(0)">`, puramente decorativos.
- Valores por defecto **hardcodeados** de credenciales de prueba (`username: '0076104905'`, `password: 'Dip@lza2026'`) en el `FormBuilder` — esto hace que el formulario nunca arranque vacío hoy, lo cual hay que corregir para cumplir el punto 1.

No existe ninguna lógica de "recordar" usuarios/cuentas ni breakpoints pensados para ocultar la imagen lateral (hoy Bootstrap la apila arriba del formulario en pantallas angostas, no la oculta).

## Objetivo

1. El campo "Cuenta" debe poder recordar hasta 5 logins (usuario + clave) previamente ingresados. La primera vez que se usa la app (sin cuentas guardadas) el formulario arranca vacío.
2. El botón "Recordarme" debe tener efecto real: si está marcado al hacer login exitoso, esa cuenta se guarda/actualiza en la lista de hasta 5; si no está marcado, no se guarda.
3. Un selector desplegable permite elegir una de las cuentas guardadas y autocompletar usuario + clave.
4. El panel de imagen lateral debe **desaparecer** (no apilarse) en ventanas angostas.
5. El link "Olvidó su clave" debe pasar a su propia línea (debajo del checkbox) en ventanas angostas, en vez de compartir fila apretada.
6. El botón de submit debe decir "Ingresar" (hoy dice "Sign in").
7. Los botones sociales deben ser Facebook, Instagram y X — habilitados visualmente, sin integración real de login social (siguen sin acción al hacer click).

Riesgo aceptado explícitamente por el usuario: la clave se guarda en `localStorage` en texto plano (junto al usuario), accesible por cualquier script que corra en esa página. No se implementa ningún cifrado ni expiración para esta primera versión.

Limitación técnica aceptada: la librería de íconos del proyecto (`angular-feather`, basada en Feather Icons) no incluye el logo nuevo de "X" — se reutiliza el ícono `twitter` (pájaro clásico) existente como placeholder visual para el botón "X".

## Enfoque

### Servicio de cuentas recordadas (`remembered-accounts.service.ts`, nuevo archivo en `src/app/core/service/`)

```typescript
interface RememberedAccount {
  username: string;
  password: string;
}
```

- `getAccounts(): RememberedAccount[]` — lee y parsea la clave `dipalza_remembered_accounts` de `localStorage` (`[]` si no existe o el JSON es inválido).
- `saveAccount(username: string, password: string): void` — si ya existe una cuenta con ese `username`, se remueve la entrada vieja y se inserta la actualizada al frente (nueva clave, por si cambió); si no existe, se inserta al frente. Luego trunca el array a 5 elementos (descarta las más antiguas, al final del array). Persiste con `localStorage.setItem`.

Sin métodos de borrado individual ni expiración — no fueron pedidos y no hay caso de uso definido todavía.

### Cambios en `signin.component.ts`

- Inyectar `RememberedAccountsService`.
- `ngOnInit()`: reemplazar los valores hardcodeados `'0076104905'` / `'Dip@lza2026'` por `''` / `''`. Exponer `accounts: RememberedAccount[] = this.rememberedAccountsService.getAccounts();` para el template.
- Nuevo método `onAccountSelected(username: string)`: busca la cuenta por username en `accounts` y hace `patchValue` de `username`/`password` en `loginForm`.
- En `onSubmit()`, dentro del bloque `next` de un login exitoso (después de confirmar `token`): si `this.f['remember'].value` es verdadero, llamar a `rememberedAccountsService.saveAccount(username, password)`. Si es falso, no hacer nada (no se toca la lista existente).

### Cambios en `signin.component.html`

- Selector desplegable de cuentas: un `<select>` (Bootstrap `form-select`) ubicado sobre el input "Cuenta", visible solo con `@if (accounts.length > 0)`. Al cambiar (`(change)`), llama a `onAccountSelected($event.target.value)`. Opciones = `accounts.map(a => a.username)`. Si `accounts.length === 0`, no se renderiza nada extra y los inputs quedan vacíos (comportamiento por defecto ya cubierto por el punto anterior).
- Botón submit (línea 50 actual): texto cambia de `Sign in` a `Ingresar`.
- Fila de "Recordame" + "Olvidó su clave" (líneas 32-45 actuales): el contenedor `d-flex justify-content-between` pasa a `d-flex flex-column flex-sm-row justify-content-sm-between`, de forma que en pantallas angostas (`<576px`, breakpoint `sm` de Bootstrap) el checkbox y el link se apilan en líneas separadas, y en pantallas ≥576px se mantienen lado a lado como hoy.
- Bloque social (líneas 52-67 actuales): se reemplazan los 4 `<li>` actuales por 3: `facebook`, `instagram`, `twitter` (como placeholder de "X"), manteniendo la misma estructura de clases (`social-icon`, `fea-social sm-icon`) y sin agregar handlers de click.

### Cambios en `_auth.scss`

- La columna de imagen (`col-md-5` en el HTML) recibe la clase Bootstrap `d-none d-md-block` directamente en el HTML (no requiere SCSS nuevo) para desaparecer por debajo de 768px en vez de apilarse. La columna del formulario pasa de `col-md-7` a `col-12 col-md-7` para ocupar el 100% del ancho cuando la imagen no está visible.
- No se requieren nuevos breakpoints custom en SCSS: tanto el ocultamiento de imagen (768px, breakpoint `md`) como el quiebre de línea de "Olvidó su clave" (576px, breakpoint `sm`) se resuelven con utilidades responsive nativas de Bootstrap ya usadas en el resto del proyecto.

### Qué NO cambia

- `ForgotComponent` sigue siendo un shell sin lógica — fuera de alcance.
- No se agrega backend ni OAuth para los botones sociales.
- El flujo de `AuthService.login()` y el manejo de tokens/errores no se toca.
- El `remember` control del `FormGroup` ya existe (`formControlName="remember"`) — no se renombra ni se mueve.

## Fuera de alcance

- Login social real (OAuth) con Facebook/Instagram/X — requeriría registrar apps en cada plataforma y soporte backend en `dipalza_server`.
- Cifrado o expiración de las credenciales guardadas en `localStorage`.
- Funcionalidad real de "Olvidó su clave" (`ForgotComponent`).
- Un ícono nativo del logo "X" (se usa el ícono `twitter` existente de Feather).
- Permitir borrar cuentas individuales desde el selector.

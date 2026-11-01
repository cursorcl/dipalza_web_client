# Revisión Web Interface Guidelines — dipalza_web_client

Revisión de las pantallas que el sistema usa (las que aparecen en `app.routes.ts`), hecha el 2026-10-31 sobre la versión v1.19.1, contra las
[Web Interface Guidelines de Vercel](https://github.com/vercel-labs/web-interface-guidelines). Esa guía reúne buenas prácticas de
accesibilidad, formularios, textos y comportamiento para interfaces web.

**Cómo marcar:** `[x]` = corregido (indicar PR o versión), `[ ]` = pendiente, `[-]` = descartado (indicar motivo).
Los números de línea son de la v1.19.1. Pueden haberse corrido en los archivos que ya se modificaron.
Las rutas de archivo son relativas a `src/app/` salvo que se indique otra cosa.

Cada observación se explica con cuatro puntos:
- **Qué pasa:** el problema concreto en el código.
- **Por qué importa:** el efecto para quien usa la aplicación.
- **Cómo corregirlo:** el cambio sugerido, con un ejemplo cuando ayuda.
- **Dónde:** archivos y líneas.

## Resumen

| Prioridad | Total | Corregidos | Descartados | Pendientes |
|---|---|---|---|---|
| P1 — Alto impacto | 7 | 6 | 1 | 0 |
| P2 — Accesibilidad de controles | 13 | 12 | 1 | 0 |
| P3 — Formularios | 10 | 10 | 0 | 0 |
| P4 — Restos de plantilla, textos y detalles | 22 | 20 | 2 | 0 |

---

## Conceptos que se repiten

Las explicaciones de abajo usan estos términos:

- **Navegar con teclado:** usar la aplicación sin mouse. Con **Tab** se pasa de un control a otro, con **Enter** o **Espacio** se activa. Lo usan personas con discapacidad motriz y también usuarios avanzados que quieren ir más rápido. Si un botón no se alcanza con Tab, para esas personas no existe.
- **Foco:** el elemento que en este momento recibe el teclado. El navegador lo marca con un borde (*outline*). Sin ese borde, quien navega con teclado no sabe dónde está.
- **`:focus-visible`:** selector CSS que solo se activa cuando el foco llegó por teclado, no por clic. Permite mostrar el borde a quien usa Tab sin molestar a quien usa mouse.
- **Lector de pantalla:** software que lee en voz alta la interfaz, para personas ciegas o con baja visión (NVDA, VoiceOver, TalkBack). Solo puede leer lo que está en el HTML como texto o como atributo de accesibilidad.
- **Nombre accesible:** el texto que el lector de pantalla dice al llegar a un control. En un botón con texto es el texto mismo. En un botón que solo tiene un ícono no hay texto, así que el lector dice "botón" sin más, salvo que se agregue `aria-label`.
- **`aria-label="..."`:** atributo que le da nombre accesible a un elemento que no tiene texto visible. Ejemplo: `<button aria-label="Ver detalle">👁</button>`.
- **`aria-hidden="true"`:** le indica al lector de pantalla que ignore un elemento decorativo, como un ícono al lado de un texto que ya dice lo mismo.
- **`aria-live="polite"` / `role="status"` / `role="alert"`:** marcan una zona cuyo contenido cambia sin recargar la página, por ejemplo un mensaje de error. Así el lector de pantalla lo anuncia cuando aparece. Sin esto, el error se muestra en pantalla pero la persona ciega no se entera.
- **`aria-expanded`:** indica si un elemento que se abre y se cierra (acordeón, menú) está abierto o cerrado.
- **`<label for="id">`:** une una etiqueta con su campo. Hace dos cosas: el lector de pantalla lee la etiqueta al llegar al campo, y hacer clic en la etiqueta pone el cursor en el campo. Sin `for`, la etiqueta es solo texto suelto.
- **`autocomplete`:** le dice al navegador y al gestor de contraseñas qué dato va en un campo (`username`, `current-password`, `new-password`…). Así ofrecen autocompletar correctamente.
- **`<a>` vs `<button>`:** `<a href>` es para **ir a otra página**: permite Ctrl+clic, abrir en pestaña nueva y copiar el enlace. `<button>` es para **ejecutar una acción** en la misma página. Un `<a>` sin `href` no es ni una cosa ni la otra: no recibe foco con Tab ni se activa con Enter.

---

## P1 — Alto impacto

### [x] P1-01 · Facturar sin confirmación — *PR #45 (v1.19.2)*
- **Qué pasaba:** en *Ventas por Facturar*, el botón "Facturar" enviaba en el acto las ventas seleccionadas a Mastersoft, sin preguntar.
- **Por qué importa:** facturar no se puede deshacer desde la aplicación. Un clic accidental, o seleccionar ventas de más con la casilla del encabezado, generaba facturas reales.
- **Qué se hizo:** antes de facturar aparece una confirmación (SweetAlert): *"¿Facturar N ventas en Mastersoft? Esta acción no se puede deshacer."* Solo factura si se presiona "Facturar".
- **Dónde:** `ventas/listado-ventas-dia/listado-ventas-dia.component.ts` (método `confirmarFacturacion()`) y su HTML.

### [x] P1-02 · Los botones no mostraban el foco del teclado — *PR #45*
- **Qué pasaba:** la plantilla del tema tenía la regla `.btn:focus { outline: none; box-shadow: none }`, que elimina todo indicador visual cuando un botón recibe el foco, y no ponía nada en su lugar.
- **Por qué importa:** al navegar con Tab, el foco pasaba por los botones de forma invisible. No había manera de saber cuál se activaría con Enter.
- **Qué se hizo:** se agregó en `src/styles.scss` una regla `:focus-visible` que dibuja un borde azul (color primario del tema) en botones, enlaces, ítems de menú, paginación y checkboxes. Solo aparece al usar el teclado; con el mouse la apariencia no cambia.
- **Dónde:** origen del problema en `assets/scss/override/_button.scss:11-23`; corrección en `src/styles.scss`.

### [-] P1-03 · Campos de texto sin foco visible — *Descartado*
- **Qué se había observado:** `.form-control:focus` también usa `outline: none` (`assets/scss/override/_misc.scss:5-11`).
- **Por qué se descartó:** al revisarlo con más detalle, el mixin `form-control-focus` (`assets/scss/_mixin.scss:146`) cambia el color de fondo y del borde cuando el campo tiene el foco. El indicador existe, solo que no es un *outline*. No hace falta corregirlo.

### [x] P1-04 · Montos con formato estadounidense — *PR #45*
- **Qué pasaba:** Angular formatea números, monedas y fechas según el "locale" (idioma y región) de la aplicación. No había ninguno configurado, así que usaba en-US por defecto.
- **Por qué importa:** los montos se veían como `$ 1,234,567`, con coma de miles. En Chile la coma es el separador decimal, así que `1,234` puede leerse como "uno coma dos" y llevar a errores al revisar totales.
- **Qué se hizo:** se registró el locale `es-CL` y se configuró `LOCALE_ID`. Ahora todos los pipes `currency` y `number` muestran `$ 1.234.567`.
- **Dónde:** `app.config.ts`.

### [x] P1-05 · La página declaraba estar en inglés — *PR #45*
- **Qué pasaba:** `src/index.html` tenía `<html lang="en">`.
- **Por qué importa:** el navegador y los lectores de pantalla usan ese atributo para decidir cómo pronunciar el texto. Un lector de pantalla leía el español con pronunciación inglesa, y Chrome ofrecía "traducir esta página del inglés".
- **Qué se hizo:** se cambió a `lang="es-CL"`.

### [x] P1-06 · El logo llevaba a una página inexistente — *PR #45*
- **Qué pasaba:** el logo del menú lateral enlazaba a `/dashboard/main`, una ruta de la plantilla que no existe en `app.routes.ts`.
- **Por qué importa:** hacer clic en el logo es la forma habitual de "volver al inicio". Aquí llevaba a la página 404.
- **Qué se hizo:** ahora enlaza a `/`, que redirige a Ventas. Además, el `alt` de la imagen pasó de `"image"` a `"Dipalza"`.
- **Dónde:** `layout/sidebar/sidebar.component.html:5`.

### [x] P1-07 · Tests rotos y pantallas sin uso — *PR #46 (v1.19.3)*
- **Qué pasaba:** en `main` fallaban 25 tests. Ninguno indicaba un error de la aplicación: eran tests desactualizados o de pantallas de la plantilla Redstar (`dashboard/`, `multilevel/`) que no estaban en las rutas.
- **Por qué importa:** con 25 fallos permanentes, un fallo nuevo y real pasa desapercibido. De hecho, toda la suite de "ventas por facturar" llevaba tiempo rota sin que nadie lo notara.
- **Qué se hizo:** se eliminaron las carpetas de la plantilla y se corrigieron los tests restantes. Ahora pasan 247/247.

---

## P2 — Accesibilidad de controles

### [x] P2-01 · Botones de ícono hechos con `<a>` sin `href` — *rama `fix/web-interface-guidelines-p2-p4`*
> **Resultado:** botones `<button>` con `aria-label`; en gestión de numerados se usa `aria-disabled` para conservar el tooltip.
- **Qué pasa:** en las tablas, las acciones "ver", "editar", "agregar" y "eliminar" son un ícono dentro de `<a (click)="...">`, sin `href` y sin texto.
  ```html
  <a class="tblViewBtn" (click)="gotoToDetail(row)" style="cursor: pointer;">
    <i class="fas fa-eye"></i>
  </a>
  ```
- **Por qué importa:**
  1. Un `<a>` sin `href` **no recibe foco con Tab** ni se activa con Enter. Sin mouse, esas acciones son imposibles.
  2. No tiene **nombre accesible**: el lector de pantalla no puede decir qué hace el ícono.
  3. El `style="cursor: pointer"` es un parche: el elemento solo *parece* clicable.
- **Cómo corregirlo:**
  - Si la acción **navega** a otra pantalla, usar un enlace real. Con eso además funciona Ctrl+clic para abrir en pestaña nueva:
    ```html
    <a [routerLink]="['/ventas/detalle-venta']" [state]="{ ventaSeleccionada: row }" aria-label="Ver detalle de la venta">
      <i class="fas fa-eye" aria-hidden="true"></i>
    </a>
    ```
  - Si la acción **ejecuta algo** en la misma pantalla (eliminar, agregar), usar un botón:
    ```html
    <button type="button" class="btn btn-link p-0" (click)="eliminarNumerado(row)" aria-label="Eliminar numerado {{ row.numero }}">
      <i class="fas fa-minus" aria-hidden="true"></i>
    </button>
    ```
- **Caso especial:** en `numerados/gestion-productos-numerados:56` el botón "quitar" se ve deshabilitado (`opacity: 0.4`), pero igual se puede hacer clic. Con un `<button>` real basta con poner `[disabled]="row.tieneRegistrosAsociados"`.
- **Dónde:**
  - `ventas/listado-ventas-dia:102`
  - `ventas/listado-ventas-dia-en-curso:84`
  - `ventas/listado-ventas-facturados-mes-actual:90`
  - `ventas/listado-resultados-facturacion-dia:36`
  - `ventas/listado-facturas-resultados-facturacion:46`, `:69`
  - `ventas/detalle-lote-facturacion:109`
  - `usuarios/listado-usuarios:64`, `:67`
  - `numerados/listado-numerados:67`, `:70`
  - `numerados/listado-numerados-de-un-producto:64`
  - `numerados/gestion-productos-numerados:56`

### [x] P2-02 · Ícono "home" del breadcrumb sin nombre — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** en cada página, el breadcrumb tiene un enlace al inicio que solo muestra el ícono de una casa (`<i class="fas fa-home">`).
- **Por qué importa:** el lector de pantalla anuncia "enlace" sin decir a dónde lleva.
- **Cómo corregirlo:**
  ```html
  <a routerLink="/" aria-label="Inicio"><i class="fas fa-home font-20" aria-hidden="true"></i></a>
  ```
- **Dónde:** todas las páginas con breadcrumb, líneas 7-9 aproximadamente.

### [x] P2-03 · Íconos decorativos que el lector de pantalla intenta leer — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** íconos como `<i class="fas fa-print"></i> Imprimir` o `<i-feather name="user">` no tienen `aria-hidden="true"`.
- **Por qué importa:** algunos lectores de pantalla anuncian el ícono como un elemento vacío o leen el nombre de la clase. Eso agrega ruido antes del texto útil.
- **Cómo corregirlo:** agregar `aria-hidden="true"` a todo ícono que acompaña a un texto o que ya tiene nombre por otra vía (como el `aria-label` del botón que lo contiene).
- **Dónde:** toda la aplicación. Conviene hacerlo junto con P2-01 y P2-02.

### [x] P2-04 · Botones del encabezado no accesibles — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** el botón que abre o cierra el menú lateral y el de pantalla completa son `<a (click)>` sin `href` y solo con ícono.
- **Por qué importa:** es el mismo problema de P2-01, pero en el encabezado, que está en todas las páginas: no se alcanzan con teclado y no tienen nombre.
- **Cómo corregirlo:** `<button type="button" aria-label="Abrir o cerrar menú">` y `<button type="button" aria-label="Pantalla completa">`.
- **Dónde:** `layout/header/header.component.html:5`, `:15`.

### [x] P2-05 · Avatar y "Logout" del encabezado — *rama `fix/web-interface-guidelines-p2-p4`*
> **Resultado:** avatar `alt=""` + `aria-label` en el toggle; "Cerrar Sesión" es `<button>`.
- **Qué pasa:**
  1. La foto de usuario tiene `alt="image"`, que no describe nada.
  2. "Logout" es `<a href="javascript:void(0);" (click)="logout()">`.
- **Por qué importa:**
  1. El lector de pantalla dice "imagen: image".
  2. `javascript:void(0)` es un enlace falso. Si alguien hace Ctrl+clic se abre una pestaña en blanco. Cerrar sesión es una acción, no una navegación.
- **Cómo corregirlo:**
  1. `alt=""`, porque la imagen es decorativa, y un `aria-label="Menú de usuario"` en el elemento que abre el menú.
  2. `<button type="button" class="dropdown-item" (click)="logout()">Cerrar Sesión</button>`, que de paso traduce el texto (ver P4-04).
- **Dónde:** `layout/header/header.component.html:22`, `:31`.

### [-] P2-06 · Submenús del menú lateral no accesibles con teclado — *Descartado*
> **Resultado:** no aplica hoy: `assets/data/routes.json` no tiene ningún ítem con submenú, todos los ítems son enlaces con `href`.
- **Qué pasa:** las opciones del menú que despliegan un submenú usan `[routerLink]="null"`, lo que en la práctica deja un `<a>` sin `href`. Además no indican si están abiertas o cerradas.
- **Por qué importa:** con Tab se saltan esas opciones, así que **no se puede llegar a las pantallas que están dentro de un submenú** sin usar el mouse. El lector de pantalla tampoco avisa que la opción despliega más opciones.
- **Cómo corregirlo:** si el ítem tiene submenú, mostrar un `<button type="button" [attr.aria-expanded]="abierto">` en vez de un `<a>`. Si no tiene submenú, dejar el `<a [routerLink]>` normal.
- **Dónde:** `layout/sidebar/sidebar.component.html:25`, `:42`, `:52`, `:63`.

### [x] P2-07 · Habilitar y bloquear usuarios con un `<span>` clicable — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** en *Gestionar Usuarios*, las insignias "Habilitado/Deshabilitado" y "Bloqueado/Desbloqueado" son `<span (click)>`. Al hacer clic cambian el estado del usuario.
- **Por qué importa:** son acciones importantes (dejan a alguien sin acceso), pero:
  1. no se alcanzan con teclado;
  2. no parecen botones, así que un usuario nuevo no sabe que son clicables;
  3. el lector de pantalla las lee como texto, no como acción.
- **Cómo corregirlo:** convertirlas en `<button type="button" class="badge ..." [attr.aria-label]="row.enabled ? 'Deshabilitar ' + row.username : 'Habilitar ' + row.username">`. La confirmación con SweetAlert que ya existe se mantiene.
- **Dónde:** `usuarios/listado-usuarios:46`, `:55`.

### [x] P2-08 · Detalle de corrida de facturación: filas y acordeón solo con mouse — *rama `fix/web-interface-guidelines-p2-p4`*
> **Resultado:** además el error ofrece "Reintentar" (P4-09).
- **Qué pasa:**
  1. Para ver el detalle de una venta hay que hacer clic en la fila de la tabla (`<tr (click)>`).
  2. Cada factura se expande haciendo clic en su encabezado (`<div (click)>`).
- **Por qué importa:** sin mouse no se puede seleccionar una venta ni abrir una factura. El lector de pantalla tampoco sabe que la fila es seleccionable ni si la factura está abierta o cerrada.
- **Cómo corregirlo:**
  1. En la fila, agregar un botón en la primera celda (`<button type="button" (click)="seleccionarVenta(venta)">#{{ venta.ventaId }}</button>`). La fila puede seguir siendo clicable para el mouse.
  2. En el encabezado de la factura, usar `<button type="button" [attr.aria-expanded]="abierta" (click)="toggleFactura(factura)">` en lugar del `<div>`.
- **Dónde:** `ventas/detalle-lote-facturacion:41`, `:59`.

### [x] P2-09 · Mapa: lista de vendedores solo con mouse — *rama `fix/web-interface-guidelines-p2-p4`*
> **Resultado:** nuevo botón ⌖ para centrar como alternativa al doble clic; el clic del mouse se mantiene.
- **Qué pasa:**
  1. El título "Vendedores" se colapsa con un `<div (click)>`.
  2. Cada vendedor es un `<div>` con clic (seleccionar) y doble clic (mostrar o ocultar el recorrido).
  3. El botón 🕘 (historial) tiene `title` pero no `aria-label`.
  4. El punto verde o gris de online/offline se distingue **solo por el color**.
- **Por qué importa:**
  1. El doble clic no tiene equivalente en teclado ni en pantallas táctiles, así que esa función queda inaccesible.
  2. El `title` no siempre lo leen los lectores de pantalla, y en móviles no se ve.
  3. Una persona daltónica no distingue verde de gris.
- **Cómo corregirlo:**
  1. Convertir el título y los ítems en `<button>`.
  2. Agregar un botón visible "Mostrar recorrido" como alternativa al doble clic.
  3. Poner `aria-label="Ver historial de recorridos"` en el botón 🕘.
  4. Agregar texto oculto para el lector, del tipo `<span class="visually-hidden">En línea</span>`, o un tooltip con el estado.
- **Dónde:** `mapa/vendor-list/vendor-list.component.html:1`, `:8-12`, `:18-24`, `:25`.

### [x] P2-10 · Mapa: historial y tramos solo con mouse — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:**
  1. El botón ✕ que cierra el panel de historial no tiene nombre.
  2. Las fechas del historial y los tramos del recorrido se eligen con clic o doble clic en la fila de la tabla.
- **Por qué importa:** lo mismo que en P2-09. Además, el lector de pantalla lee "✕" como "multiplicación" o "x".
- **Cómo corregirlo:**
  1. `aria-label="Cerrar historial"` en el ✕.
  2. Un botón por fila, o `tabindex="0"` con manejo de Enter en la fila.
  3. Una alternativa visible al doble clic en tramos (por ejemplo, un botón "Centrar en el mapa").
- **Dónde:** `mapa/historial-panel:3`, `:22`; `mapa/tramos-table:1`, `:19-22`.

### [x] P2-11 · Mensajes que aparecen sin que el lector de pantalla los anuncie — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** varios mensajes aparecen dinámicamente (errores, confirmaciones, avisos), pero no están marcados como zonas que cambian.
- **Por qué importa:** una persona ciega presiona "Ingresar", aparece "Usuario o clave incorrectos" y **no se entera**. El lector de pantalla no lee contenido nuevo salvo que se le indique.
- **Cómo corregirlo:**
  - Para errores, usar `role="alert"`, que se anuncia de inmediato.
  - Para avisos y estados, usar `role="status"` o `aria-live="polite"`, que se anuncian cuando el lector termina lo que está diciendo.
  - Los spinners necesitan un texto oculto, por ejemplo `<span class="visually-hidden">Cargando…</span>`.

  Ejemplo:
  ```html
  <div class="alert alert-danger" role="alert">{{ error }}</div>
  ```
- **Dónde:**
  - error de login: `authentication/signin:66`
  - mensajes de cambiar clave: `perfil/cambiar-clave:34`, `:37`; `perfil/cambiar-clave-obligatorio:25`
  - aviso "Sin conexión con Mastersoft": `ventas/listado-ventas-dia:25`
  - toast del mapa: `mapa/mapa.component.html:6`
  - contador de numerados agregados: `numerados/edicion-numerados:40`
  - spinners: `ventas/listado-vendedores-faltantes:55`, `ventas/listado-hoja-ruta:56`

### [x] P2-12 · Modal de stock de una línea — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:**
  1. El botón de cerrar (X) de este modal no tiene `aria-label`. Todos los demás modales sí lo tienen.
  2. La tabla usa `<th>` como título de cada fila, pero sin `scope="row"`.
- **Por qué importa:**
  1. El lector de pantalla dice solo "botón".
  2. Sin `scope`, el lector puede no asociar cada valor con su título ("Stock antes: 120").
- **Cómo corregirlo:** `aria-label="Cerrar"` en el botón y `<th scope="row">` en cada título de fila.
- **Dónde:** `ventas/detalle-lote-facturacion/stock-linea-modal/stock-linea-modal.component.html:3`, `:9-36`.

### [x] P2-13 · Faltantes y Hoja de Ruta: controles de fecha y vista — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:**
  1. Los botones ‹ y › para cambiar de día solo tienen un ícono de flecha.
  2. El campo de fecha no tiene etiqueta.
  3. En Faltantes, los botones "Por Factura" y "Por Producto" funcionan como un interruptor, pero no indican cuál está activo salvo por el color.
- **Por qué importa:**
  1. El lector de pantalla dice "botón, botón" sin indicar que uno retrocede y otro avanza.
  2. Dice "campo de fecha" sin saber para qué es.
  3. El interruptor solo se distingue por color (mismo problema que P2-09).
- **Cómo corregirlo:**
  1. `aria-label="Día anterior"` y `aria-label="Día siguiente"` en las flechas.
  2. `aria-label="Fecha"` en el input, o un `<label>`.
  3. `[attr.aria-pressed]="vista === 'factura'"` en los botones de vista.
- **Dónde:** `ventas/listado-vendedores-faltantes:26`, `:29`, `:31`, `:37-45`; `ventas/listado-hoja-ruta:27`, `:30`, `:32`.

---

## P3 — Formularios

### [x] P3-01 · Campo "Buscar:" de los listados — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** nueve listados tienen el mismo buscador:
  ```html
  <label class="col-form-label">Buscar:</label>
  <input type="text" class="form-control" (keyup)='updateFilter($event)'>
  ```
  Tiene tres problemas:
  1. El `<label>` no está unido al campo (falta `for` / `id`).
  2. Es `type="text"`, cuando existe `type="search"`.
  3. El filtro se ejecuta en `keyup`, es decir, solo al soltar una tecla.
- **Por qué importa:**
  1. El lector de pantalla no anuncia "Buscar" al entrar al campo, y hacer clic en la palabra "Buscar:" no pone el cursor en el campo.
  2. `type="search"` agrega una X para limpiar el campo y en móviles muestra la tecla "Buscar".
  3. **Este es un error funcional:** si el usuario pega texto con clic derecho → Pegar, o borra con la X o con el menú, no se suelta ninguna tecla y **la tabla no se filtra**. El campo muestra un texto y la tabla otra cosa.
- **Cómo corregirlo:**
  ```html
  <label for="buscar" class="col-form-label">Buscar:</label>
  <input id="buscar" type="search" class="form-control" autocomplete="off" (input)="updateFilter($event)">
  ```
  `(input)` se dispara con cualquier cambio del contenido, venga del teclado, del mouse o de autocompletar.
- **Dónde:**
  - `ventas/listado-ventas-dia:18`
  - `ventas/listado-detalle-ventas-dia:25`
  - `ventas/listado-ventas-dia-en-curso:18`
  - `ventas/listado-detalle-ventas-dia-en-curso:25`
  - `ventas/listado-ventas-facturados-mes-actual:18`
  - `ventas/listado-detalle-ventas-facturados-mes-actual:25`
  - `usuarios/listado-usuarios:18`
  - `numerados/listado-numerados:18`
  - `numerados/listado-numerados-de-un-producto:28`

### [x] P3-02 · Login: etiquetas y autocompletado — *rama `fix/web-interface-guidelines-p2-p4`*
> **Resultado:** se unificó con el gestor de contraseñas del navegador: se eliminó la lista propia, que guardaba claves en texto plano en localStorage, y se borra esa clave al abrir el login. El usuario pasó a `type="text"` (no son correos).
- **Qué pasa:**
  1. Las etiquetas "Cuenta" y "Clave" no están unidas a sus campos.
  2. El campo de usuario tiene `autocomplete="off"`.
  3. El campo de clave no tiene `autocomplete`.
- **Por qué importa:**
  1. Mismo problema de etiquetas que en P3-01.
  2. `autocomplete="off"` en un login **impide que el gestor de contraseñas** del navegador (o 1Password, Bitwarden, etc.) reconozca el formulario y ofrezca la cuenta guardada. Es probable que se haya puesto para que no compita con la lista propia de cuentas recordadas; en ese caso hay que decidir cuál de las dos se prefiere. La guía recomienda no bloquear al gestor del navegador.
  3. El corrector ortográfico subraya los nombres de usuario como faltas de ortografía.
- **Cómo corregirlo:**
  ```html
  <label for="username">Cuenta</label>
  <input id="username" autocomplete="username" spellcheck="false" ...>
  <label for="password">Clave</label>
  <input id="password" type="password" autocomplete="current-password" ...>
  ```
- **Dónde:** `authentication/signin/signin.component.html:19`, `:22`, `:45`, `:47`.

### [x] P3-03 · Login: lista de cuentas guardadas sin semántica — *rama `fix/web-interface-guidelines-p2-p4`*
> **Resultado:** resuelto al eliminar la lista propia (ver P3-02); el navegador ofrece las cuentas guardadas.
- **Qué pasa:** al enfocar el campo de usuario se despliega una lista de cuentas guardadas, que se recorre con flechas. Visualmente funciona, pero el HTML no informa que es una lista de sugerencias.
- **Por qué importa:** el lector de pantalla no anuncia que hay sugerencias, cuántas son ni cuál está seleccionada al usar las flechas. Para una persona ciega, la función no existe.
- **Cómo corregirlo:** aplicar el patrón estándar de *combobox*:
  - en el input: `role="combobox"`, `[attr.aria-expanded]="showSuggestions"`, `aria-controls="lista-cuentas"` y `[attr.aria-activedescendant]` apuntando a la opción resaltada;
  - en la lista: `<ul id="lista-cuentas" role="listbox">`, con `role="option"` y un `id` en cada ítem.
- **Dónde:** `authentication/signin/signin.component.html:21-40`.

### [x] P3-04 · Login: botón "Ingresar" deshabilitado y sin indicador de carga — *rama `fix/web-interface-guidelines-p2-p4`*
> **Resultado:** errores por campo, foco en el primero, botón deshabilitado solo durante la petición ("Ingresando…").
- **Qué pasa:**
  1. El botón queda gris (deshabilitado) mientras falte algún campo.
  2. Al presionarlo no muestra que está procesando.
- **Por qué importa:**
  1. Un botón deshabilitado no explica **qué falta**; el usuario no sabe por qué no puede ingresar. La guía recomienda dejarlo habilitado y, al presionarlo, mostrar junto a cada campo qué falta.
  2. Si el servidor tarda, el usuario no sabe si el clic funcionó y tiende a presionar varias veces.
- **Cómo corregirlo:**
  1. Quitar `loginForm.invalid` del `[disabled]` y validar en `onSubmit()`, mostrando los errores.
  2. Mantener el botón deshabilitado solo durante la petición, con un spinner como en "Olvidó su clave".
- **Dónde:** `authentication/signin/signin.component.html:69`.

### [x] P3-05 · Olvidó su clave: orden de tabulación forzado — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:**
  1. El campo y el botón tienen `tabindex="1"` y `tabindex="2"`.
  2. Al campo le faltan `autocomplete` y `spellcheck`.
- **Por qué importa:**
  1. Un `tabindex` mayor que 0 altera el orden natural de Tab: esos elementos pasan a ser los primeros de **toda la página**, antes del encabezado o de cualquier otra cosa. Es una práctica desaconsejada porque genera saltos confusos. El orden natural del HTML ya era el correcto.
  2. Mismo caso que P3-02.
- **Cómo corregirlo:** quitar ambos `tabindex` y agregar `autocomplete="username" spellcheck="false"`. Al spinner del botón agregarle `aria-hidden="true"`.
- **Dónde:** `authentication/forgot/forgot.component.html:17-26`.

### [x] P3-06 · Cambiar contraseña: etiquetas y autocompletado — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** las tres etiquetas no están unidas a sus campos, y ningún campo indica qué tipo de clave es.
- **Por qué importa:** con `autocomplete="new-password"` el navegador **ofrece generar una clave segura** y actualiza la contraseña guardada. Con `current-password` autocompleta la clave actual. Sin esto, el gestor de contraseñas no ayuda y puede guardar la clave equivocada.
- **Cómo corregirlo:** `for`/`id` en cada par; `autocomplete="current-password"` en "Clave actual" y `autocomplete="new-password"` en "Clave nueva" y "Confirmar".
- **Dónde:** `perfil/cambiar-clave/cambiar-clave.component.html:10-27`.

### [x] P3-07 · Cambio de clave obligatorio: Enter no envía — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:**
  1. Las etiquetas no están unidas a sus campos.
  2. Falta `autocomplete="new-password"`.
  3. El botón "Guardar" está en el pie del modal, **fuera** del `<form>`.
- **Por qué importa:**
  1. y 2. Igual que P3-06.
  3. Lo esperable es escribir la clave, confirmarla y presionar Enter. Como el `<form>` no tiene ningún botón de envío dentro, **Enter no hace nada**.
- **Cómo corregirlo:** darle un `id` al form y unir el botón con el atributo `form`:
  ```html
  <form id="form-clave" [formGroup]="form" (ngSubmit)="submit()"> ... </form>
  <!-- en el pie del modal -->
  <button type="submit" form="form-clave" class="btn btn-primary">Guardar</button>
  ```
- **Dónde:** `perfil/cambiar-clave-obligatorio/cambiar-clave-obligatorio.component.html:9`, `:17`, `:34`.

### [x] P3-08 · Crear y modificar usuario — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:**
  1. Las etiquetas no están unidas a sus campos.
  2. Los campos de usuario y correo tienen corrector ortográfico.
  3. La "Clave inicial" no indica que es una clave nueva.
  4. Los mensajes de error usan `style="color:red"` y no están asociados al campo.
  5. "Guardar" está deshabilitado mientras falte algo.
- **Por qué importa:**
  1. y 2. Igual que en P3-02.
  3. Con `autocomplete="new-password"` el navegador no intenta rellenarla con la clave del administrador.
  4. El rojo fijo no respeta el tema (por ejemplo el modo oscuro), y el lector de pantalla no lee el error al entrar al campo.
  5. Igual que P3-04: el usuario no sabe qué le falta.
- **Cómo corregirlo:** para el punto 4, usar la clase de Bootstrap `invalid-feedback` (como ya hace `cambiar-clave`) y unir el error al campo:
  ```html
  <input id="username" aria-describedby="username-error" ...>
  <div id="username-error" class="invalid-feedback">El username es obligatorio</div>
  ```
- **Dónde:** `usuarios/crear-usuario/crear-usuario.component.html:9-44`; `usuarios/modificar-usuario/modificar-usuario.component.html:9-19`.

### [x] P3-09 · Numerados: etiquetas y teclado numérico — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:**
  1. Las etiquetas de producto, número y peso no están unidas a sus campos.
  2. El campo peso es `type="number"` con decimales, pero sin `inputmode`.
- **Por qué importa:**
  1. Igual que en P3-01.
  2. En tablets y celulares, `inputmode="decimal"` hace aparecer el teclado numérico con punto o coma decimal, lo que agiliza el ingreso.
- **Cómo corregirlo:** `for`/`id` en cada par, y `inputmode="decimal"` en el peso.
- **Dónde:** `numerados/edicion-numerados:10`, `:21`, `:30-31`; `numerados/gestion-productos-numerados:13`.

### [x] P3-10 · Placeholders — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:**
  1. Los textos de ejemplo dentro de los campos no siguen un formato común.
  2. Algunos están en inglés: "Email", "Password" (login) y "Search" (404/500).
- **Por qué importa:**
  1. La convención es terminar el placeholder con "…" (`Ej: jperez…`) para que no se confunda con un valor ya ingresado.
  2. Los textos en inglés son inconsistentes con el resto de la aplicación.
- **Cómo corregirlo:** revisar todos los placeholders: traducirlos y usar el formato `Ej: <ejemplo>…`.

---

## P4 — Restos de plantilla, textos y detalles

### Restos de la plantilla Redstar

#### [x] P4-01 · Pie de página de la plantilla — *rama `fix/web-interface-guidelines-p2-p4`*
> **Resultado:** el componente footer no se usaba en ningún layout; se eliminó.
- **Qué pasa:** el footer dice *"Copyright © 2022 Design By Redstar · Coded with ♥"*. El enlace usa `href="#" onClick="return false;"`.
- **Por qué importa:** es texto del proveedor de la plantilla, con un año viejo. Da una imagen poco profesional del sistema.
- **Cómo corregirlo:** reemplazarlo por un texto propio (por ejemplo "© 2026 Dipalza" y la versión de la app), o eliminar el footer.
- **Dónde:** `layout/footer/footer.component.html`.

#### [x] P4-02 · Panel de configuración de temas — *rama `fix/web-interface-guidelines-p2-p4`*
> **Resultado:** eliminado; el tema ya elegido lo sigue aplicando el header.
- **Qué pasa:** en el borde derecho hay un engranaje que **gira sin parar** y abre un panel de la plantilla para cambiar tema (claro/oscuro), color del menú y color general. Además:
  - los textos están en inglés ("Setting Panel", "Select Layout"…);
  - las imágenes no tienen `alt`;
  - los colores se eligen con `<li (click)>`, que no funciona con teclado.
- **Por qué importa:**
  - Una animación infinita distrae, y molesta especialmente a personas con trastornos de atención o vestibulares.
  - El panel no es parte del negocio. Si nadie lo usa, es código y superficie de errores de más.
- **Cómo corregirlo:** decidir si se usa. Si no, eliminar `<app-right-sidebar>` del layout. Si se usa, quitar `fa-spin`, traducir los textos y hacer accesibles los controles.
- **Dónde:** `layout/right-sidebar/right-sidebar.component.html`; se incluye en `layout/app-layout/main-layout/main-layout.component.html`.

#### [x] P4-03 · Buscador falso en las páginas de error — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** las páginas 404 y 500 tienen un campo "Search" con botón "Buscar". El formulario no tiene lógica: al presionar Buscar no ocurre nada útil.
- **Por qué importa:** ofrece una función que no existe y confunde justo cuando el usuario ya está perdido.
- **Cómo corregirlo:** eliminar el formulario y dejar solo el mensaje y el enlace "Volver a Inicio".
- **Dónde:** `authentication/page404/page404.component.html:10-26`; `authentication/page500/page500.component.html:18-20`.

### Textos

#### [x] P4-04 · Textos en inglés — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** quedan textos en inglés mezclados con el español.
- **Por qué importa:** es inconsistente, y algunos usuarios pueden no entenderlos.
- **Cómo corregirlo:**
  - "Logout" → "Cerrar Sesión" (`layout/header:33`)
  - columna "Actions" → "Acciones" (`ventas/listado-ventas-dia:98`, `ventas/listado-ventas-dia-en-curso:80`)
  - "Search:" → "Buscar:" (`ventas/listado-detalle-ventas-dia-en-curso:25`)
  - los textos del panel de temas (ver P4-02)

#### [x] P4-05 · Errores de tipeo en login y encabezado — *rama `fix/web-interface-guidelines-p2-p4`*
> **Resultado:** "Recordame" desapareció junto con el checkbox (P3-02).
- **Qué pasa / cómo corregirlo:**
  - "Recordame" → **"Recordarme"** (`authentication/signin:57`).
  - "Olvidó su clave ?" → **"¿Olvidó su clave?"**: falta el signo de apertura y sobra el espacio (`authentication/signin:62`).
  - "Hola {{userFullName}}.." → **"Hola, {{userFullName}}"**: los dos puntos finales parecen un error (`layout/header:26`).
- **Por qué importa:** la pantalla de login es lo primero que ve cada usuario.

#### [x] P4-06 · "Procesando..." con tres puntos — *PR #45*
- Se cambió a "Procesando…". El carácter "…" es tipográficamente correcto, los lectores de pantalla lo leen mejor y no se separa en dos líneas.

#### [x] P4-07 · "Cargando..." con tres puntos — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** igual que P4-06, en el detalle de corrida de facturación.
- **Cómo corregirlo:** usar "Cargando…".
- **Dónde:** `ventas/detalle-lote-facturacion:125`.

#### [x] P4-08 · Botones con texto genérico — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** varios botones dicen "Guardar", "Agregar" o "Quitar" sin decir qué guardan, agregan o quitan.
- **Por qué importa:** un texto específico confirma la acción antes del clic. Además, el lector de pantalla suele listar todos los botones de la página, y en esa lista "Agregar, Agregar, Guardar" no se distingue.
- **Cómo corregirlo:**
  - "Guardar" → "Cambiar Clave" (`perfil/cambiar-clave:43`)
  - "Agregar" → "Agregar Usuario" (`usuarios/listado-usuarios:23`)
  - "Agregar" → "Agregar Producto" (`numerados/gestion-productos-numerados:24`)
  - "Quitar" → "Quitar Vendedor" (`usuarios/modificar-usuario:25`)

#### [x] P4-09 · Mensaje de error sin salida — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** si falla la carga del detalle de una corrida de facturación, se muestra *"No se pudo cargar el detalle de este lote (¿existe?)."* y nada más.
- **Por qué importa:** el usuario no sabe qué hacer. El mensaje no explica la causa ni ofrece una acción.
- **Cómo corregirlo:** agregar un botón "Reintentar" y un enlace "Volver a Corridas de Facturación". Si el servidor devuelve un mensaje, mostrarlo.
- **Dónde:** `ventas/detalle-lote-facturacion:128`.

### Formatos y datos

#### [-] P4-10 · Formato de fecha fijo — *Descartado*
> **Resultado:** `shortDate` en es-CL produce `01-11-26` (año de 2 dígitos, guiones); se mantiene `dd/MM/yyyy`.
- **Qué pasa:** las fechas usan `date:'dd/MM/yyyy'` escrito a mano en cada listado.
- **Por qué importa:** es poco. Ahora que existe `LOCALE_ID = es-CL` (P1-04), Angular puede formatear según la región con `date:'shortDate'`, lo que evita repetir el formato en cada lugar. Como `dd/MM/yyyy` ya es el formato chileno, **el cambio es solo de mantención y no se nota en pantalla**.
- **Cómo corregirlo:** opcional. Si se hace, revisar que `shortDate` en es-CL muestre el año con 4 dígitos, porque podría mostrar `01-11-26`. Si no, mantener el formato explícito.
- **Dónde:** todos los listados con columna de fecha.

#### [x] P4-11 · Montos desalineados en las tablas — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** en las fuentes normales, cada dígito tiene un ancho distinto (el "1" es más angosto que el "8").
- **Por qué importa:** en una columna de montos alineada a la derecha, `$ 111.111` y `$ 888.888` quedan con anchos distintos y las cifras no se alinean verticalmente. Comparar montos de un vistazo se vuelve más difícil.
- **Cómo corregirlo:** una regla CSS global para las celdas numéricas:
  ```scss
  .align-right-cell, .text-end { font-variant-numeric: tabular-nums; }
  ```
- **Dónde:** `src/styles.scss`.

#### [x] P4-12 · Fecha de creación de usuario sin formato — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** en *Detalle de usuario*, "Creado el" muestra el texto `createdAt` tal como viene del servidor, sin pasar por el pipe `date`. Lo más probable es que se vea en formato técnico, del tipo `2026-08-14T15:32:10`. Confirmarlo abriendo el detalle de un usuario.
- **Por qué importa:** ese formato es difícil de leer para un usuario normal y puede estar en hora UTC en vez de hora de Chile.
- **Cómo corregirlo:** `{{ usuario.createdAt | date:'dd/MM/yyyy HH:mm' }}`.
- **Dónde:** `usuarios/ver-usuario/ver-usuario.component.html:30`.

### Diseño de pantalla y estados

#### [x] P4-13 · Panel de totales que tapa la tabla — *rama `fix/web-interface-guidelines-p2-p4`*
> **Resultado:** fijo en pantallas ≥1400px (intención original); en más angostas pasa bajo la tabla.
- **Qué pasa:** en las pantallas de detalle de venta, el recuadro de totales (Neto, IVA, Total) está fijo en la esquina superior derecha (`position: fixed; top: 70px; right: 20px; z-index: 1000`).
- **Por qué importa:** en pantallas angostas (notebooks pequeños, tablets) **queda encima de las columnas de la tabla** y tapa datos. También puede tapar el elemento que tiene el foco del teclado.
- **Cómo corregirlo:** sacarlo de `fixed`. Por ejemplo, ponerlo debajo o al lado de la tabla con flexbox, o hacerlo `sticky` dentro de su contenedor. En pantallas chicas, que pase abajo.
- **Dónde:** `ventas/listado-detalle-ventas-dia:98` y su SCSS, más las variantes `listado-detalle-ventas-dia-en-curso` y `listado-detalle-ventas-facturados-mes-actual`.

#### [x] P4-14 · Panel de totales vacío al recargar — *rama `fix/web-interface-guidelines-p2-p4`*
> **Resultado:** versión mínima: aviso con enlace al listado. Cargar la venta por id desde el servidor queda pendiente.
- **Qué pasa:** la venta llega a la pantalla de detalle "en memoria" desde el listado (`router state`). Si el usuario recarga la página (F5), ese dato se pierde y el panel muestra "Fecha:", "Rut:", "Neto:" sin valores.
- **Por qué importa:** la pantalla se ve rota y el usuario no entiende qué pasó.
- **Cómo corregirlo:** como mínimo, si `venta` es null, mostrar *"No hay venta seleccionada"* con un enlace al listado. Lo ideal es que la URL lleve el id de la venta y la pantalla la cargue desde el servidor (ver P4-21).
- **Dónde:** `ventas/listado-detalle-ventas-dia:98-139` y variantes.

#### [x] P4-15 · Títulos fuera de orden — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** en el detalle de corrida de facturación aparece un `<h6>` (fechas de inicio y fin) antes del `<h5>` "Ventas".
- **Por qué importa:** los lectores de pantalla permiten saltar de título en título para entender la estructura de la página. Un nivel menor antes que uno mayor rompe esa estructura.
- **Cómo corregirlo:** convertir las fechas en un párrafo (`<p>`) o ajustar los niveles para que bajen en orden (h5 → h6).
- **Dónde:** `ventas/detalle-lote-facturacion:21`, `:30`.

#### [x] P4-16 · Columna de tabla sin título — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** la última columna de la tabla de ítems (la del ícono "ver stock") tiene un `<th></th>` vacío.
- **Por qué importa:** el lector de pantalla anuncia las celdas de esa columna sin decir de qué son.
- **Cómo corregirlo:** `<th><span class="visually-hidden">Acciones</span></th>`, que es invisible en pantalla pero se lee.
- **Dónde:** `ventas/detalle-lote-facturacion:82`.

#### [-] P4-17 · Nombres largos en la lista de vendedores del mapa — *Descartado*
> **Resultado:** ya estaba resuelto: `.vendor-list__info` tiene `min-width: 0` y el nombre usa `text-overflow: ellipsis`; se agregó `title` con el nombre completo.
- **Qué pasa:** el nombre del vendedor está en un contenedor flex sin límite de ancho.
- **Por qué importa:** un nombre largo empuja el botón de historial y el indicador de estado fuera del recuadro, o hace crecer la lista.
- **Cómo corregirlo:** en `.vendor-list__info` agregar `min-width: 0`. En el nombre, agregar `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` para que se corte con "…" y poner el nombre completo en `title`.
- **Dónde:** `mapa/vendor-list/vendor-list.component.html:15` y su SCSS.

### Imágenes y carga

#### [x] P4-18 · Imágenes del login — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:**
  1. La foto lateral tiene `alt="login"`.
  2. El logo tiene `alt="logo"`.
  3. Ninguna tiene `width` ni `height`.
- **Por qué importa:**
  1. La foto es decorativa: debe tener `alt=""` para que el lector la ignore, en vez de decir "imagen: login".
  2. El `alt` del logo debería ser el nombre de la marca, "Dipalza".
  3. Sin dimensiones, el navegador no reserva el espacio y el formulario **salta** cuando la imagen termina de cargar (el problema se conoce como *layout shift*).
- **Cómo corregirlo:** `alt=""` en la foto, `alt="Dipalza"` en el logo, y `width`/`height` con el tamaño real de cada archivo.
- **Dónde:** `authentication/signin/signin.component.html:6`, `:12`.

#### [x] P4-19 · Carga de fuentes e íconos — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** `index.html` carga desde Google Fonts cinco variantes de Material Icons (normal, Outlined, Two Tone, Round, Sharp) más la fuente Karla. No hay `preconnect` y falta `theme-color`.
- **Por qué importa:**
  - Cada variante de íconos es una descarga. Si la app solo usa Font Awesome y Feather, esas cinco son peso innecesario en cada carga.
  - `<link rel="preconnect">` adelanta la conexión con Google Fonts y acelera la primera carga.
  - `theme-color` define el color de la barra del navegador en móviles.
- **Cómo corregirlo:**
  1. Quitar el `<link>` de Material Icons. Verificado el 2026-11-01: ningún archivo de `src/app` usa la clase `material-icons`. Antes de quitarlo, confirmar que tampoco aparece en `src/assets`.
  2. Agregar `<link rel="preconnect" href="https://fonts.googleapis.com">` y `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`.
  3. Agregar `<meta name="theme-color" content="...">` con el color del encabezado.
- **Dónde:** `src/index.html:10-13`.

### Animación y estado en la URL

#### [x] P4-20 · Animaciones de la plantilla — *rama `fix/web-interface-guidelines-p2-p4`*
> **Resultado:** parcial: regla global `prefers-reduced-motion`. Los `transition: all` del tema se mantienen.
- **Qué pasa:**
  1. Los estilos del tema usan `transition: all` en unos 20 lugares.
  2. No hay ninguna regla que respete la preferencia de "reducir movimiento" del sistema operativo.
- **Por qué importa:**
  1. `transition: all` anima **cualquier** propiedad que cambie, incluidas las que no deberían animarse (ancho, alto, márgenes). Eso provoca animaciones raras y consume más recursos.
  2. Algunas personas configuran "reducir movimiento" porque las animaciones les causan mareo; la app debería respetarlo.
- **Cómo corregirlo:** como mínimo, una regla global:
  ```scss
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
  ```
  Reemplazar cada `transition: all` por las propiedades específicas es más trabajo y de menor prioridad.
- **Dónde:** `assets/scss/override/*` y `assets/scss/layouts/*`. Ejemplos: `_navbar.scss:61`, `_table.scss:72`, `_card.scss:588`, `_layout.scss:14`, `_sidebar.scss:395`.

#### [x] P4-21 · Lo que el usuario elige no queda en la URL — *rama `fix/web-interface-guidelines-p2-p4`*
> **Resultado:** versión mínima: fecha/vista de Faltantes y Hoja de Ruta y página de Corridas. El texto del buscador de listados no se guarda en la URL.
- **Qué pasa:** el texto buscado en los listados, la fecha elegida en Faltantes y Hoja de Ruta, la vista (por factura o por producto) y la página de Corridas de Facturación se guardan solo en memoria.
- **Por qué importa:** si el usuario recarga (F5), vuelve atrás, o copia el enlace para enviárselo a un colega, **pierde lo que había elegido**. Por ejemplo, no se puede mandar el enlace "la hoja de ruta del 15 de octubre".
- **Cómo corregirlo:** guardar esos valores como parámetros de la URL (`?fecha=2026-10-15&vista=producto`) con el `Router` de Angular, y leerlos al abrir la pantalla.
- **Dónde:** `ventas/listado-vendedores-faltantes`, `ventas/listado-hoja-ruta`, `ventas/listado-lotes-facturacion` y los listados con buscador (P3-01).

#### [x] P4-22 · Botón "Ver" que navega — *rama `fix/web-interface-guidelines-p2-p4`*
- **Qué pasa:** en *Corridas de Facturación*, el botón "Ver" de cada fila es un `<button>` que, al hacer clic, navega al detalle.
- **Por qué importa:** como es un botón y no un enlace, no se puede Ctrl+clic para abrir varias corridas en pestañas ni copiar el enlace. Es el caso inverso de P2-01.
- **Cómo corregirlo:** `<a class="btn btn-sm btn-primary" [routerLink]="['/ventas/lotes-facturacion', row.id]">Ver</a>`. Se ve igual, pero se comporta como enlace.
- **Dónde:** `ventas/listado-lotes-facturacion:50`.

---

## Historial

| Fecha | Cambio |
|---|---|
| 2026-10-31 | Revisión inicial (v1.19.1). |
| 2026-11-01 | P1 completo: PR #45 (v1.19.2) y PR #46 (v1.19.3). P1-03 descartado tras verificarlo. Explicaciones ampliadas para cada observación. |
| 2026-11-01 | P2, P3 y P4 en la rama `fix/web-interface-guidelines-p2-p4`. Descartados: P2-06 (no hay submenús), P4-10 (shortDate cambia el formato), P4-17 (ya estaba resuelto). Pendientes fuera de alcance: cargar el detalle de venta por id (P4-14), buscador en la URL (P4-21) y reemplazar los `transition: all` del tema (P4-20). |

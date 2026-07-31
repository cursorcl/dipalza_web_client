# Panel de vendedores flotante y selección única

## Contexto

`vendor-list.component` (creado en PR #6) hoy es una columna lateral fija dentro de `mapa-layout` (`width: 280px; height: 100%`) que empuja el mapa y ocupa siempre el alto completo del contenedor, sin importar cuántos vendedores haya. Cada fila tiene un checkbox que permite seleccionar varios vendedores a la vez; `MapaComponent.seleccionados: Signal<Set<string>>` guarda las claves seleccionadas y `trayectoriasPorVendedor: Map<string, L.LayerGroup>` guarda una capa de recorrido por cada uno, todas visibles simultáneamente.

La revisión final del PR #7 (nodos numerados de parada) detectó que con selección múltiple activa los badges verde/rojo de inicio/fin de distintos vendedores se ven iguales y no se distinguen entre sí. En vez de ajustar colores, se decidió entonces eliminar la selección múltiple. Ahora se suma un pedido de UI más amplio para el panel mismo: debe flotar semi-transparente sobre el mapa, ser colapsable, usar el mínimo alto posible (con scroll si la lista no entra), y las filas deben seleccionarse sin checkbox ni riesgo de seleccionar texto al hacer clic. Esta spec cubre ambos cambios juntos, ya que el segundo obliga a resolver el primero (sin checkbox, el clic en la fila tiene que significar algo).

## Objetivo

1. Selección única: un solo vendedor con recorrido visible a la vez. Clic en su marcador o en su fila de la lista:
   - Si es el vendedor ya seleccionado → deselecciona (oculta su recorrido).
   - Si es otro vendedor → oculta el recorrido anterior (si había uno) y muestra el nuevo.
2. El panel de vendedores deja de ser una columna que empuja el mapa: flota sobre la esquina superior derecha del mapa, con fondo semi-transparente.
3. El panel es colapsable mediante un encabezado fijo (título + flecha); colapsado, solo queda visible el encabezado.
4. El panel usa el mínimo alto posible: con pocos vendedores se ajusta al contenido; si la lista excede el alto disponible del mapa, aparece scroll interno en vez de seguir creciendo.
5. Se elimina el checkbox de cada fila. La fila completa es el área de clic, y no debe seleccionarse texto accidentalmente al hacer clic. La fila del vendedor activo queda resaltada visualmente.
6. El doble clic en un marcador sigue centrando el mapa en él, sin afectar la selección — comportamiento actual, no cambia.

## Enfoque

### Modelo de selección (`mapa.component.ts`)

- `seleccionados: Signal<Set<string>>` se reemplaza por `seleccionado: Signal<string | null>`.
- `toggleTrayectoria(vendedor)` cambia su lógica interna:
  - Si `key === seleccionado()` → comportamiento actual de "quitar": remueve la capa de `historialLayer`, borra la entrada de `trayectoriasPorVendedor`, pone `seleccionado.set(null)`.
  - Si `key !== seleccionado()` (incluyendo el caso `seleccionado() === null`) → si había una selección anterior, primero se oculta esa capa igual que en el caso de arriba (sin pasar por `cargando`, ya está cargada); luego sigue el flujo actual de pedir el histórico (respetando `cargando` para no duplicar pedidos del nuevo vendedor) y en `mostrarTrayectoria` hace `seleccionado.set(key)` en vez de agregar a un Set.
- `trayectoriasPorVendedor` se mantiene como `Map` por simplicidad de implementación (aunque con selección única nunca tendrá más de una entrada a la vez) — evita reescribir `ajustarVistaATrayectoriasVisibles`, que ya itera el Map sin asumir cardinalidad.
- `cargando: Set<string>` no cambia — sigue evitando pedidos duplicados del histórico mientras está en vuelo.

### `vendor-list.component`: de columna a panel flotante

**Template:** se quita el `<input type="checkbox">` de cada fila. La fila entera recibe `(click)="onSeleccionar(vendedor)"` (reemplaza el rol que tenía el checkbox); `(dblclick)` para centrar se mantiene igual que hoy. Se agrega un encabezado nuevo fuera del `@for`, con el título y un botón/flecha que alterna un signal local `colapsado = signal(false)`; el cuerpo con la lista se envuelve en un contenedor que solo se renderiza (o se colapsa a `height: 0` con `overflow: hidden`) según ese signal.

**Input/Output:** `selectedIds: Set<string>` se reemplaza por `selectedId: string | null` (refleja el cambio en `MapaComponent`); `trayectoriaToggled` se sigue emitiendo igual, ahora desde el handler de clic de la fila en vez del `change` del checkbox — ya no hace falta la lógica de reafirmar el estado del checkbox (`event.target.checked = ...`) porque no hay checkbox que reafirmar.

**Estilos (`vendor-list.component.scss`):**
- `:host` pasa de columna (`width: 280px; height: 100%; border-left: ...`) a panel flotante: `position: absolute; top: 16px; right: 16px; max-width: 280px; max-height: calc(100% - 32px); background: rgba(255,255,255,0.85); border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.25); display: flex; flex-direction: column; overflow: hidden;` (el `overflow: hidden` en el host recorta las esquinas redondeadas; el scroll de la lista va en el contenedor del cuerpo).
- El cuerpo con la lista (`.vendor-list__body` o similar) tiene `overflow-y: auto` y ningún `height` fijo — así el panel crece con el contenido hasta el `max-height` del host, punto en el que el scroll interno toma el control.
- Filas: se agrega `user-select: none` para que el clic no seleccione texto, y una clase de estado `.vendor-list__item--selected` (fondo distinto, ej. `rgba(0,0,0,0.06)`) aplicada cuando `isSelected(vendedor)` es verdadero.

**`mapa.component.html`:** dentro de `.map-wrapper` (que ya es `position: relative`), `<app-vendor-list>` pasa de estar al lado (hermano de `.map-wrapper` dentro de `.mapa-layout`) a estar dentro de `.map-wrapper`, para que el `position: absolute` del panel se ancle al mapa y no a todo el layout de la página. El binding `[selectedIds]="seleccionados()"` cambia a `[selectedId]="seleccionado()"`.

### Nota sobre clic + doble clic en la fila

Al agregar un handler de `click` a la fila que antes solo tenía `dblclick` (para centrar), un doble clic del usuario dispara la secuencia nativa del navegador `click, click, dblclick`: la selección se activa y desactiva una vez antes de que el mapa se centre. Es una animación visual de un instante (el estado final tras el doble clic es el mismo que antes: sin cambio en la selección, mapa centrado) y no un bug funcional — se acepta como trade-off menor, sin lógica adicional de por medio para distinguirlo (debounce, timers), ya que no se pidió y añadiría complejidad al componente.

### Qué NO cambia

- El algoritmo de detección de paradas (`detectar-paradas.ts`) y el renderizado de nodos numerados (PR #7) — solo cambia que ahora nunca hay más de una trayectoria dibujada a la vez, lo cual además resuelve el problema de badges ambiguos entre vendedores detectado en la revisión final del PR #7.
- El backend, el filtro por `tipo === '0'` del padrón (PR #8), el toast de error/vacío, y `ajustarVistaATrayectoriasVisibles`.
- El doble clic sobre el marcador para centrar el mapa (`centrarEnVendedor`).

## Fuera de alcance

- Animación de expandir/colapsar el panel (transición CSS simple si es trivial, pero no es un requisito).
- Persistir el estado colapsado/expandido entre sesiones o recargas de página.
- Hacer el panel arrastrable o reposicionable por el usuario.
- Buscador/filtro de texto dentro del panel de vendedores (no se pidió, y la lista es acotada — 10 vendedores tipo 0 en los datos actuales).

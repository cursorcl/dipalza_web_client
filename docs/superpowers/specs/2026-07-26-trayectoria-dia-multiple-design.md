# Recorrido del día por vendedor (selección múltiple)

## Contexto

`MapaComponent` (`src/app/mapa/mapa.component.ts`) ya tiene una función `consultarYDibujarTrayectoriaDia(codigo, tipo)` que se dispara solo al hacer **clic en un marker** del mapa: pide el histórico de posiciones del día vía `PositionsService.getHistoric(...)` (endpoint `POST /api/posicion/historico`, ya soportado por el backend con filtro por `vendedorIds` + `dia`), dibuja una única polyline en `historialLayer` y hace `fitBounds`. Antes de dibujar, limpia toda la capa (`historialLayer.clearLayers()`), por lo que solo puede verse la trayectoria de **un** vendedor a la vez.

El método `showHistory(points)` existe pero no se usa en ningún lado (código muerto).

`VendorListComponent` (`src/app/mapa/vendor-list/`) muestra la lista de vendedores con un punto de color, nombre, tiempo relativo y estado online/offline. Al hacer doble clic en una fila emite `vendedorSeleccionado` (el `vendedorId`), que `MapaComponent.centrarEnVendedor()` usa solo para recentrar el mapa sobre la posición actual — no dibuja ninguna trayectoria.

`mapa.component.scss` tiene además un bloque de reglas (`.tooltip-vendedor-clean`, `.label-minimal`, etc.) duplicado literalmente dos veces seguidas (líneas 1-43 y 44-75).

## Objetivo

1. Permitir ver el recorrido del día de **varios vendedores a la vez**, no solo de uno.
2. Agregar un checkbox por fila en `VendorListComponent` que controla si la trayectoria de ese vendedor está visible en el mapa.
3. Que el clic en un marker del mapa haga lo mismo que marcar/desmarcar ese checkbox (mismo estado compartido).
4. El doble clic en una fila de la lista mantiene su comportamiento actual: solo centra el mapa, sin afectar las trayectorias visibles.
5. Mostrar cada punto GPS del recorrido (no solo la línea), distinguiendo el punto de inicio y el más reciente.
6. Avisar de forma discreta cuando un vendedor no tiene registros de posición para el día actual.
7. Eliminar el código muerto (`showHistory`) y el bloque de CSS duplicado.

## Enfoque

### Estado de trayectorias visibles

En `MapaComponent`:

- `private trayectoriasPorVendedor = new Map<string, L.LayerGroup>()`: una capa por vendedor actualmente visible, agregada/quitada individualmente de `historialLayer` (que pasa a ser un contenedor de sub-capas en vez de dibujarse directo en él).
- `seleccionados = signal<Set<string>>(new Set())`: claves de los vendedores con trayectoria visible. La clave es `${codigo}_${tipo}`, la misma convención que ya usa `colorForVendedor` y `groupBySeller`, para no introducir un segundo esquema de identidad.

### Método unificado `toggleTrayectoria({codigo, tipo, nombre}: VendedorId & { nombre: string })`

Reemplaza `consultarYDibujarTrayectoriaDia` y elimina `showHistory` (muerto). Es el único punto de entrada, llamado tanto desde el clic en el marker como desde el checkbox de la lista:

1. Calcula `key = \`${codigo}_${tipo}\``.
2. Si `trayectoriasPorVendedor.has(key)` (ya visible) → remueve ese `LayerGroup` de `historialLayer`, lo borra del `Map`, y quita `key` del `Set` de `seleccionados`. No se ajusta el zoom al deseleccionar (evita saltos bruscos de vista).
3. Si no está visible → llama a `positionService.getHistoric({ vendedorIds: [{codigo, tipo}], dia: hoy })`:
   - Si `puntos.length > 0`: arma un `L.layerGroup` nuevo con:
     - La polyline de siempre (color determinístico vía `colorForVendedor(key)`, mismo estilo actual).
     - Un `L.circleMarker` pequeño (radio ~4, mismo color, opacity 0.6) por cada punto intermedio, con popup mostrando la hora (`TimeFormatter` o formato simple `HH:mm`) al hacer clic.
     - Dos `L.circleMarker` más grandes y distinguibles para el primer punto ("Inicio — HH:mm") y el último ("Última posición — HH:mm").
     - Agrega el `LayerGroup` a `historialLayer` y lo guarda en `trayectoriasPorVendedor`, agrega `key` a `seleccionados`.
     - Ajusta `fitBounds` a la **unión de bounds de todas las trayectorias actualmente visibles** (no solo la nueva), para mantener en pantalla todo lo seleccionado.
   - Si `puntos.length === 0`: muestra un toast discreto ("Sin recorrido registrado hoy para {nombre}", auto-oculta a los ~3s) y **no** agrega `key` a `seleccionados` (el checkbox queda sin marcar).

Se usa `L.circleMarker` (vector liviano) en vez de `L.marker` con ícono por punto, para no degradar el rendimiento con recorridos largos (un vendedor reporta cada 30s, un día completo puede tener varios cientos de puntos).

### Toast simple

No hay ninguna librería de notificaciones en el proyecto (`ngx-toastr`, Angular Material, etc. no están instalados) — no se agrega una dependencia nueva solo para esto. Se implementa un toast mínimo propio en `MapaComponent`: un signal `toastMensaje = signal<string | null>(null)`, mostrado condicionalmente en `mapa.component.html` con un `<div class="mapa-toast">`, con `setTimeout` de ~3s para limpiarlo. Estilo simple en `mapa.component.scss`.

### Cambios en `VendorListComponent`

- Se agrega un checkbox por fila, independiente del resto de la interacción de la fila:
  - `@Input() selectedIds: Set<string> = new Set()` — el componente calcula la key `${item.vendedorId}_${item.vendedorCodigo}` (mismos campos que ya expone `VendedorListItem`, ver nota de nomenclatura abajo) para decidir si el checkbox aparece marcado.
  - `@Output() trayectoriaToggled = new EventEmitter<VendedorListItem>()` — se emite al cambiar el checkbox (`(change)`), el padre decide qué hacer.
- El doble clic en la fila **no cambia**: sigue emitiendo `vendedorSeleccionado` (el `vendedorId`) para que `MapaComponent.centrarEnVendedor()` solo recentre, sin tocar trayectorias.

> Nota de nomenclatura (heredada, no se corrige en este cambio): en `VendedorListItem`, el campo `vendedorId` en realidad contiene el `codigo` del vendedor y `vendedorCodigo` contiene su `tipo`. Es así desde `actualizarListaVendedores()` y se mantiene por consistencia con el resto del componente — no se renombra en este spec para no mezclar un refactor de nombres con la funcionalidad nueva.

### Cambios en `MapaComponent`

- `marker.on('click', ...)`: en vez de llamar a `consultarYDibujarTrayectoriaDia(vendedorId, vendedorCodigo)`, llama a `toggleTrayectoria({codigo: vendedorId, tipo: vendedorCodigo, nombre: vendedorNombre})` con los datos ya presentes en el closure (`data: PosicionDTO`). Como el checkbox de la lista está bindeado al mismo signal `seleccionados`, se marca/desmarca solo.
- `mapa.component.html`: se conecta el nuevo `(trayectoriaToggled)` de `<app-vendor-list>` a `toggleTrayectoria(...)` y se pasa `[selectedIds]="seleccionados()"`. Se agrega el `div.mapa-toast` condicional.
- `mapa.component.scss`: se elimina el bloque de reglas duplicado (queda una sola copia de `.tooltip-vendedor-clean`, `.label-minimal`, etc.) y se agregan los estilos del toast.
- Se elimina `showHistory()` (muerto). `groupBySeller()` también se elimina: hoy solo lo invoca `showHistory()`, y el agrupamiento por vendedor en el nuevo `toggleTrayectoria` no lo necesita (cada llamada ya trabaja sobre un único vendedor).
- `centrarEnVendedor()` se mantiene sin cambios.

## Fuera de alcance

- No se agrega un control para "limpiar todas las trayectorias visibles de una vez" — deseleccionar es checkbox por checkbox (o clic en cada marker). Se puede evaluar más adelante si resulta incómodo en uso real.
- No se persiste qué vendedores están seleccionados entre sesiones/recargas de página.
- No se resuelve el límite de colores de la paleta (20 colores determinísticos, ya documentado en `2026-07-21-lista-vendedores-mapa-design.md`) — con más de 20 vendedores visibles simultáneamente podrían repetirse colores.
- No se modifica el backend: el endpoint `POST /api/posicion/historico` ya soporta todo lo necesario.
- No se pagina ni se limita la cantidad de vendedores con trayectoria visible a la vez.

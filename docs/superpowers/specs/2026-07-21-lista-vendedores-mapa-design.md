# Lista de vendedores junto al mapa

## Contexto

`MapaComponent` (`src/app/mapa/mapa.component.ts`) muestra un mapa Leaflet con un marcador por vendedor, actualizado en vivo por WebSocket (`WSPositionService`) y con una carga inicial por REST (`PositionsService`). Cada marcador tiene un color asignado por `getColorForVendedor(key)`, que hoy asigna colores **por orden de llegada** (el primer vendedor que se conecta se queda con `colorPellete[0]`, el segundo con `colorPellete[1]`, etc., avanzando un índice compartido `colorIndex`). Esto significa que el mismo vendedor puede aparecer con un color distinto de una sesión a otra, dependiendo de en qué orden llegan sus posiciones.

No existe hoy ninguna vista de lista/listado de los vendedores visibles en el mapa: solo se ven como marcadores con tooltip.

## Objetivo

1. Mostrar, al lado derecho del mapa, una lista de los vendedores actualmente visibles, cada uno con: punto de color, nombre, tiempo relativo desde su último reporte ("hace 45 seg") y un indicador online/offline.
2. Que el color de cada vendedor sea **determinístico**: el mismo vendedor debe verse siempre con el mismo color, sin depender del orden de conexión ni de sesión a sesión.
3. Al hacer doble clic en una fila de la lista, centrar el mapa en la última posición conocida de ese vendedor.

## Enfoque

### Color determinístico

Se reemplaza la asignación por orden de llegada (`colors: Map` + `colorIndex` incremental) por una función pura `colorForVendedor(key: string): string` que calcula un hash simple (tipo djb2) sobre `vendedorId_vendedorCodigo` y lo mapea con módulo al índice de `colorPellete` (`generateColorPellete(20)`, sin cambios). Al ser una función pura, no requiere caché ni estado — se llama igual desde el mapa (marcadores) y desde la lista, garantizando que ambos coincidan siempre.

Límite conocido y aceptado: con más de 20 vendedores simultáneos, dos podrían compartir color (igual límite que existe hoy con la paleta de 20 colores). No se resuelve en este cambio.

### Estado reactivo en `MapaComponent`

`MapaComponent` ya mantiene `posicionesActuales: Map<string, PosicionDTO>` (poblado en `updatePositionOnMap`) y un intervalo de 1 segundo (`tooltipRefreshInterval`) que hoy solo refresca los tooltips del mapa. Se agrega:

- Una señal `vendedores = signal<VendedorListItem[]>([])`, recalculada:
  - Cada vez que `updatePositionOnMap` recibe datos nuevos.
  - En cada tick del `tooltipRefreshInterval` existente (1s) — para que el tiempo relativo y el estado online/offline de la lista se mantengan al día sin crear un segundo timer.
- `VendedorListItem` (interfaz nueva, en `mapa/models/model.ts`): `{ vendedorId, vendedorNombre, color, fechaHora, tiempoRelativo, online }`.
- `online` se calcula como `(Date.now() - new Date(fechaHora).getTime()) < 2 * 60 * 1000` (offline a partir de 2 minutos sin reportar, confirmado con el usuario).

### Componente nuevo: `VendorListComponent`

Standalone, ubicado en `src/app/mapa/vendor-list/` (`.component.ts/.html/.scss`), siguiendo el patrón de los demás componentes de `mapa/`.

- `@Input() vendedores: VendedorListItem[] = []`
- `@Output() vendedorSeleccionado = new EventEmitter<string>()` (emite el `vendedorId` al hacer doble clic en una fila)
- Plantilla: lista simple (`<ul>`/`<li>` o `div` con `@for`), cada fila con un punto de color (`div` con `background-color` inline), el nombre, el tiempo relativo, y un punto pequeño verde/gris para online/offline. Estilo minimalista, sin cajas ni bordes pesados, reutilizando la estética ya usada en `.label-minimal` (tooltip del mapa) en vez de introducir un lenguaje visual nuevo.
- Sin paginación ni buscador: es una lista simple, scrolleable si excede el alto disponible (`overflow-y: auto`).

### Cambios en `MapaComponent`

- Plantilla (`mapa.component.html`): el contenido pasa de un único `div.map-container` a un contenedor flex con dos hijos: `div.map-container` (flex: 1) y `app-vendor-list` (ancho fijo ~280px), mismo alto que hoy (`calc(100vh - 100px)`).
- Nuevo método `centrarEnVendedor(vendedorId: string)`: busca el marcador correspondiente en `this.markers` y hace `this.map.setView(marker.getLatLng(), this.map.getZoom())` — mantiene el nivel de zoom actual del usuario, solo recentra. Se conecta al `(vendedorSeleccionado)` del nuevo componente.
- El clic simple sobre el marcador (que hoy dispara `consultarYDibujarTrayectoriaDia`) no cambia.
- `getColorForVendedor` se reemplaza por la nueva función pura `colorForVendedor` en ambos lugares donde se usa hoy (creación de marcador y `groupBySeller`/trayectorias), para que el color de la trayectoria histórica también sea consistente con el de la lista y el marcador en vivo.

## Fuera de alcance

- No se resuelve la colisión de colores más allá de 20 vendedores simultáneos.
- No se agrega búsqueda, filtro ni orden manual en la lista (se muestra en el orden en que Angular itera el Map/array interno).
- No se persiste la lista ni el estado online/offline en backend: es un cálculo puramente derivado en el cliente a partir de `fechaHora`.
- No se modifica el backend.

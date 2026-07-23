# Lista de vendedores: padrón completo + quitar tiempo del marker

## Contexto

En el incremento anterior de esta feature (`2026-07-21-lista-vendedores-mapa-design.md`), la lista lateral del mapa se construye a partir de `posicionesActuales` en `MapaComponent` — es decir, solo aparecen vendedores que **ya reportaron al menos una posición**. No existe hoy ningún endpoint en el backend (`dipalza_server`) que devuelva el padrón completo de vendedores; lo único parecido es `VendedorRutaController` (`GET /api/vendedores/{codigo}/{tipo}/rutas`), que es sobre rutas de un vendedor puntual, no un listado.

El tooltip del marcador en el mapa (`generateLabel()` en `MapaComponent`) hoy muestra nombre + tiempo relativo. La lista lateral (`VendorListComponent`) también muestra tiempo relativo, en una fila separada — eso no cambia.

## Objetivo

1. La lista lateral debe mostrar **todos los vendedores del sistema**, incluso los que nunca han reportado una posición (mostrando "Sin datos" y offline para esos).
2. El tooltip del marcador del mapa deja de mostrar el tiempo relativo — solo el nombre. La lista lateral no se toca en este punto, sigue mostrando el tiempo.

## Enfoque

### Backend (`dipalza_server`, rama `fix/posicion-lat-lon-schema`)

Nuevo endpoint de solo lectura, siguiendo el mismo patrón Controller → Service → Repository que ya usa `PosicionController`/`PosicionService`:

- `VendedorService.listarTodos(): List<VendedorDTO>` — llama a `vendedorRepository.findAll()` y mapea cada `Vendedor` con `VendedorMapper.toDto()` (ya existe, no se toca).
- `VendedorController` nuevo, `@RequestMapping("/api/vendedores")`, `@GetMapping` sin path variables → `GET /api/vendedores`. No colisiona con `VendedorRutaController` (que está en `/api/vendedores/{codigo}/{tipo}/rutas`, con path variables).
- Hereda la regla de seguridad existente `/api/**` → `.authenticated()`; no se toca `SecurityConfigDevSec`/`ProdSec`.

### Frontend (`dipalza_web_client`, rama `feature/lista-vendedores-mapa`)

- Nueva interfaz `VendedorDTO` en `mapa/models/model.ts`: `{ codigo: string; tipo: string; nombre: string }` (subset de los campos que expone el backend; los campos extra del lado servidor —rut, ciudad, comuna, dirección, teléfono— no se necesitan acá y TypeScript los ignora sin problema al parsear el JSON).
- Nuevo `VendedorService` en `mapa/vendedor.service.ts`: `getVendedores(): Observable<VendedorDTO[]>`, GET a `${environment.apiUrl}/vendedores`. Mismo patrón que `PositionsService`.
- `MapaComponent`:
  - En `ngAfterViewInit`, junto a `loadInitialPositions()`, se agrega `cargarPadronVendedores()`: llama a `vendedorService.getVendedores()`, guarda el resultado en `private padronVendedores: VendedorDTO[] = []`, y llama a `actualizarListaVendedores()` al recibir la respuesta (para que la lista se pueble aunque todavía no haya llegado ninguna posición).
  - `actualizarListaVendedores()` cambia su fuente: en vez de iterar `posicionesActuales.values()`, itera `this.padronVendedores`. Para cada vendedor del padrón:
    - `key = \`${vendedor.codigo}_${vendedor.tipo}\``
    - `posicion = this.posicionesActuales.get(vendedor.codigo)` (el Map ya existente, sigue igual)
    - Si hay `posicion`: `fechaHora`, `tiempoRelativo` y `online` se calculan igual que hoy.
    - Si no hay `posicion`: `fechaHora: ''`, `tiempoRelativo: TimeFormatter.formatRelativeTime('')` (ya devuelve `'Sin datos'` para string vacío — no hace falta duplicar ese texto), `online: false`.
    - `color: colorForVendedor(key)` siempre (función pura, no depende de si ya reportó).
  - No se crea ningún marcador en el mapa para vendedores sin posición — el marcador sigue apareciendo únicamente cuando llega una `PosicionDTO` real vía REST o WebSocket, sin cambios ahí.
- `generateLabel()` (tooltip del marcador): se quita el `<div class="tiempo">...</div>`, queda solo el nombre. La función sigue llamándose desde `updateTooltips`/`updatePositionOnMap` sin cambios de firma.

## Fuera de alcance

- No se ordena la lista (alfabético, por estado, etc.) — queda en el orden en que el backend devuelve el padrón.
- No se agrega paginación ni búsqueda en la lista, aunque el padrón completo sea más grande que los ~20 colores de la paleta (limitación de colisión de color ya aceptada en el incremento anterior).
- No se distingue visualmente (más allá de "Sin datos" + punto offline) a un vendedor que nunca reportó de uno que reportó hace mucho tiempo — ambos quedan offline con la misma apariencia.
- No se modifica `SecurityConfig` ni ningún otro endpoint existente.

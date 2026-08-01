# Tabla de tramos por calle en el recorrido del día

## Contexto

`mostrarTrayectoria` (`mapa.component.ts`, ver PR #7 "Nodos numerados de parada") ya calcula, para el vendedor seleccionado, una lista de nodos vía la función pura `detectarParadas` (`detectar-paradas.ts`): el inicio del día, cada parada real (>10 min dentro de ~100m) y la última posición conocida, numerados en orden cronológico y dibujados en el mapa con un badge numerado. Cada nodo tiene `numero`, `latitud`, `longitud`, `comienzo`, `fin`, `esInicio`, `esFin`, `esParada`.

El usuario compartió originalmente una captura de otro sistema de tracking (GPS7000, ver historial de esta conversación) que mostraba, además de los marcadores numerados en el mapa, una tabla debajo agrupando el recorrido por calle con hora de entrada/salida de cada tramo. En su momento (spec de PR #7) se decidió implementar solo los marcadores numerados y dejar la tabla por calle para una spec posterior, porque requiere geocodificación inversa — capacidad que no existía en el proyecto. Esta spec cubre esa tabla.

**Restricción técnica descubierta durante el diseño:** el servicio de geocodificación inversa elegido, Nominatim (OpenStreetMap, gratuito y sin API key — ver `reference-osrm-ruteo-publico` en memoria para el precedente de OSRM/Nominatim en este workspace), no envía cabeceras CORS, por lo que el navegador no puede llamarlo directo. La consulta debe pasar por `dipalza_server`, lo que además permite cachear resultados y respetar el límite de uso de Nominatim (máx. ~1 consulta/segundo).

## Objetivo

1. Debajo del mapa, un panel flotante semi-transparente y colapsable (mismo patrón visual que el panel de vendedores del PR #10), a todo el ancho del mapa, con una fila por cada nodo numerado del vendedor seleccionado (Inicio, cada parada real, Última posición — los mismos que ya se dibujan en el mapa).
2. Columnas: **N°**, **Tipo** (mismo texto que ya usan los popups de los nodos: "Inicio", "Parada N — HH:MM a HH:MM" se simplifica aquí a solo la etiqueta "Parada N", "Última posición"), **Calle**, **Hora de detención**, **Hora de fin**.
3. `Hora de detención` = `comienzo` del nodo. `Hora de fin` = `comienzo` del **siguiente** nodo de la lista (no el `fin` propio del nodo) — para que los tramos queden continuos sin huecos, igual que en la referencia GPS7000. La última fila no tiene siguiente nodo: su `Hora de fin` queda vacía.
4. El nombre de calle se resuelve por geocodificación inversa (Nominatim) contra la posición del nodo, a través de un nuevo endpoint en `dipalza_server` (nunca directo desde el navegador, por la restricción de CORS).
5. La tabla aparece apenas hay nodos calculados (igual que el mapa), con cada fila mostrando un estado "Buscando calle…" hasta que su consulta de geocodificación resuelve — no se espera a tener las 6-8 calles completas para mostrar la tabla.
6. Solo visible cuando hay un vendedor seleccionado (mismo ciclo de vida que el resto del panel de recorrido); desaparece al deseleccionar.

## Enfoque

### Backend (`dipalza_server`) — nuevo endpoint de geocodificación inversa

Primera integración HTTP saliente del backend (no existe `RestTemplate`/`WebClient` en el proyecto hoy) — nuevo bean `RestTemplate` en una clase de configuración.

**Endpoint:** `GET /api/geocodificacion/inversa?lat={lat}&lon={lon}` → `{ "calle": string }`. Un punto por llamada, no un batch — así el frontend dispara una consulta por nodo en paralelo y cada fila de la tabla se completa de forma independiente apenas llega su respuesta, sin bloquear a las demás.

**`GeocodificacionService.obtenerCalle(double lat, double lon)`:**
- `@Cacheable` con Caffeine, mismo patrón que ya usa `ClienteService`/`CacheConfig` (cache en memoria, sin tabla nueva en la BD — coherente con que el resto de los caches del proyecto son solo en memoria). Clave de cache: lat/lon redondeados a 5 decimales (~1 metro de precisión), como string `"lat,lon"`.
- En caso de cache miss, llama a `https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=jsonv2`, con header `User-Agent` descriptivo de la app (la política de uso de Nominatim lo exige).
- Extrae el nombre de calle del JSON de respuesta con fallback: `address.road` → `address.pedestrian` → `address.footway` → `address.cycleway` → si ninguno existe, el primer segmento de `display_name` → si todo falla, el literal `"Calle sin identificar"`.
- Limita las llamadas reales a Nominatim a ~1/segundo mediante un lock compartido en el service (campo `private final Object nominatimLock` + timestamp de la última consulta real, con `Thread.sleep` del tiempo faltante dentro del bloque `synchronized`). Como el service es un bean singleton, esto serializa las llamadas reales a Nominatim aunque lleguen varias solicitudes HTTP en paralelo desde el frontend — cada request simplemente espera su turno dentro del backend, sin que el cliente tenga que coordinar nada. El lock se adquiere solo en el camino de cache-miss: los hits de cache devuelven de inmediato, sin pasar por el lock.
- Si la llamada a Nominatim falla (timeout, error de red, respuesta no-200), no lanza excepción hacia el controller: devuelve `"Calle no disponible"` y registra el error en el log. Un fallo en un nodo no debe tumbar la consulta de los demás (cada uno es una request HTTP independiente de todos modos).

**Nuevos archivos:**
- `config/RestTemplateConfig.java` (o agregar el bean a una config existente si hay una genérica) — bean `RestTemplate` con timeout de conexión/lectura configurado (ej. 5s conexión, 8s lectura, para no dejar threads colgando si Nominatim no responde).
- `service/GeocodificacionService.java`
- `controller/GeocodificacionController.java`
- `model/GeocodificacionResponseDTO.java` (`{ calle: String }`)
- Agregar el nombre del nuevo cache (ej. `GEOCODIFICACION_CALLE`) a `CacheConfig.java`, mismo patrón que las constantes `CLIENTES_BY_*` ya existentes.

### Frontend (`dipalza_web_client`)

**Nuevo servicio `src/app/mapa/geocodificacion.service.ts`:**
```typescript
obtenerCalle(lat: number, lon: number): Observable<{ calle: string }>
```
GET simple al nuevo endpoint, mismo patrón que `PositionsService`/`VendedorService` (usa `environment.apiUrl`).

**Nuevo componente `src/app/mapa/tramos-table/tramos-table.component.ts`:**
- `@Input() nodos: NodoParada[]` (mismo tipo que ya exporta `detectar-paradas.ts`).
- Internamente construye las filas a partir de `nodos`: `{ numero, tipo, calle: string | null, horaDetencion: string, horaFin: string | null }`, donde `tipo` reutiliza la misma lógica de etiqueta que hoy vive en `mostrarTrayectoria` (`esInicio` → "Inicio", `esFin` → "Última posición", si no "Parada {numero}"; si es simultáneamente parada real e inicio/fin, igual que en el popup del mapa, prioridad al texto de parada — aquí simplificado a solo la etiqueta "Parada {numero}" sin el rango horario, ya que el rango horario completo lo dan las columnas de hora de detención/fin de la tabla).
- Al recibir `nodos` (vía `ngOnChanges` o un `effect` si se convierte a signal input), dispara `geocodificacionService.obtenerCalle(...)` para cada nodo en paralelo (un `subscribe` por nodo, no `forkJoin` — así cada fila se actualiza independiente apenas resuelve la suya, sin esperar a las demás). Mientras no resuelve, la celda de calle muestra `"Buscando calle…"`.
- Colapsable con `colapsado = signal(false)` y `alternarColapso()`, mismo patrón que `VendorListComponent` del PR #10 (encabezado con flecha).
- Estilos: `position: absolute; bottom: 16px; left: 16px; right: 16px;` (ancho completo del mapa, con margen), fondo `rgba(255, 255, 255, 0.85)`, `max-height` acotado con scroll interno en el cuerpo de la tabla si excede (mismo criterio de alto mínimo que el panel de vendedores).

**`mapa.component.ts` / `mapa.component.html`:**
- `mostrarTrayectoria` ya calcula `const nodos = detectarParadas(puntos);` localmente — se agrega un nuevo signal `nodosSeleccionados = signal<NodoParada[]>([])` que se setea ahí (`this.nodosSeleccionados.set(nodos);`) y se limpia (`this.nodosSeleccionados.set([]);`) en el mismo punto donde hoy se oculta la trayectoria (`ocultarTrayectoria`/el branch de deselección de `toggleTrayectoria`).
- `mapa.component.html` agrega `<app-tramos-table [nodos]="nodosSeleccionados()"></app-tramos-table>` dentro de `.map-wrapper` (mismo contenedor que ancla el panel de vendedores), condicionado a que haya nodos (`@if (nodosSeleccionados().length > 0)`).

### Qué NO cambia

- `detectarParadas`, el renderizado de nodos numerados y sus popups en el mapa (PR #7).
- El modelo de selección única y el panel de vendedores (PR #10) — la tabla es un panel adicional, no reemplaza nada existente.
- El backend no cambia nada de `PosicionController`/`PosicionService`; el nuevo endpoint de geocodificación es completamente independiente.

## Nota de implementación: dos repos

Esta feature toca `dipalza_server` (nuevo endpoint) y `dipalza_web_client` (tabla + servicio que lo consume) — dos ramas y dos PRs independientes, uno por repo, cada uno con su propio ciclo de brainstorm→plan ya cerrado en esta spec conjunta. El backend debe implementarse y desplegarse primero (o al menos el endpoint debe existir contra el mismo servidor que consulta el frontend en desarrollo) para que el frontend tenga algo real que consumir; en caso de necesitar probar el frontend antes de que el backend esté desplegado en el servidor real, mockear la respuesta del endpoint en el entorno de desarrollo local del cliente.

## Fuera de alcance

- Persistir el resultado de geocodificación en base de datos (el cache es solo en memoria, coherente con el resto de los caches del proyecto; se pierde al reiniciar el backend, lo cual es aceptable).
- Agrupar filas consecutivas que caigan en la misma calle (ej. una parada y la siguiente en la misma cuadra) — cada nodo es siempre su propia fila.
- Editar o corregir manualmente el nombre de calle devuelto por Nominatim.
- Mostrar la tabla para más de un vendedor a la vez (no aplica: el modelo es de selección única desde el PR #10).
- Exportar la tabla (CSV/PDF) o imprimirla.

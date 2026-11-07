# Reporte de ubicaciones en PDF — Plan de implementación

> **Para agentes:** SUB-SKILL REQUERIDA: usar superpowers:subagent-driven-development (recomendado) o superpowers:executing-plans para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** desde la vista del mapa de la web, generar un único PDF con, por cada vendedor seleccionado y cada día con datos del rango (hasta 31 días), el mapa del recorrido completo y la tabla de paradas persistidas.

**Arquitectura:**
- Todo el PDF se arma en el navegador:
  - por cada vendedor, de a uno, se piden posiciones y paradas del rango y se agrupan por día;
  - cada mapa se compone directamente en un `<canvas>` (mosaicos OSM más polilínea más marcadores, proyectados con `L.CRS.EPSG3857`) y se inserta como JPEG en un `jsPDF`;
  - un orquestador maneja el progreso y la cancelación.
- En el servidor solo se agrega una validación de rango (de 1 a 31 días, filtro temporal obligatorio) en los dos endpoints históricos.

**Stack:** Angular 20 (standalone, signals), Leaflet 1.9.4 (solo para la proyección), `jspdf@4.2.1`, `jspdf-autotable@5.0.9`, ng-bootstrap `NgbModal`, Karma/Jasmine. Servidor: Spring Boot, JUnit 5, `@WebMvcTest`.

**Spec:** `docs/superpowers/specs/2026-11-06-reporte-ubicaciones-pdf-design.md` (en este repo). Leerlo junto con este plan.

## Restricciones globales

- Nombres, comentarios y textos de la UI en español.
- Rango máximo: **31 días** (inclusivo), validado en el cliente y en el servidor.
- Aviso de volumen cuando vendedores × días > **100** (no bloquea).
- Colores de los marcadores: inicio `#2ecc71`, fin `#e74c3c`. Las paradas usan `colorForVendedor(\`${codigo}_${tipo}\`)`.
- Atribución visible en cada mapa: `© colaboradores de OpenStreetMap`.
- Nombre del archivo: `reporte-ubicaciones_<desde>_<hasta>.pdf`, o `reporte-ubicaciones_<fecha>.pdf` si `desde === hasta` (fechas `YYYY-MM-DD`).
- Paradas: solo las de `POST /deteccion/historico`. **No** usar `detectar-paradas.ts` ni geocodificar.
- Un "día" es el prefijo `YYYY-MM-DD` de `fechaHora` / `horaInicio`, tal como vienen del servidor (`LocalDateTime` sin zona, la misma convención que el filtro `dia`). No convertir zonas horarias.
- Fechas enviadas al servidor como `LocalDateTime` en texto: `desde = '<YYYY-MM-DD>T00:00:00'`, `hasta = '<YYYY-MM-DD>T23:59:59'`.
- No cambia el comportamiento actual de la vista del mapa.
- Git:
  - Ramas: `feat/reporte-ubicaciones` (web_client, ya creada desde `origin/main`) y `feat/tope-rango-historico` (dipalza_server, crear desde `origin/main`).
  - Nunca push a main.
  - Títulos de PR con prefijo `feat:`.
  - En Bash, siempre `cd <ruta-absoluta> && …` (el cwd se resetea).

## Foco de revisión

1. **Una sola posición en el día.** Encuadre con un solo punto: los límites son de tamaño cero y el zoom no debe ser infinito ni `NaN`. Se espera un zoom igual al tope (16) centrado en el punto. Test en la Tarea 4.
2. **Mosaico que no carga (red o CORS).** El PDF no debe abortar ni salir con un mapa negro. Se espera un fondo gris claro en ese cuadro y que se siga. Test en la Tarea 4.
3. **Posiciones fuera de orden** (reencoladas por el móvil). La polilínea debe seguir el orden de `fechaHora`, no el de llegada. Test en la Tarea 3.
4. **Muchos vendedores** (más de los que caben en una página de índice). El índice no debe pisar las páginas de los vendedores. Se espera que reserve las páginas necesarias (`Math.ceil(n / 30)`). Test en la Tarea 5.
5. **Cancelar mientras hay una petición HTTP en vuelo.** Se espera que no se descargue nada, que no quede una promesa colgada y que el diálogo vuelva a quedar utilizable. Test en la Tarea 6.

---

### Tarea 1: Servidor — tope de rango en los endpoints históricos

**Repo:** `/Users/cursor/Dev/dipalza/application_v2.0/dipalza_server/dipalza`. Antes de empezar: `git fetch && git switch -c feat/tope-rango-historico origin/main`. La rama activa hoy es otra y hay archivos sin seguimiento ajenos; no tocarlos.

**Archivos:**
- Modificar: `src/main/java/cl/eos/dipalza/specifications/PosicionFilter.java`
- Modificar: `src/main/java/cl/eos/dipalza/controller/PosicionController.java` (`obtenerHistorico`)
- Modificar: `src/main/java/cl/eos/dipalza/controller/DeteccionController.java` (`obtenerHistorico`)
- Test: `src/test/java/cl/eos/dipalza/specifications/PosicionFilterTest.java` (nuevo)
- Test: `src/test/java/cl/eos/dipalza/controller/DeteccionControllerTest.java` y `PosicionControllerTest.java`

**Interfaces:**
- Produce: `PosicionFilter.validarRango()`. Lanza `ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje)`. `public static final int MAX_DIAS_RANGO = 31;`

- [ ] **Paso 1: escribir los tests que fallan** en `PosicionFilterTest`:
  - `validarRango_aceptaSoloDia()`: `dia = 2026-11-06` → no lanza.
  - `validarRango_acepta31Dias()`: `desde 2026-10-01T00:00`, `hasta 2026-10-31T23:59:59` → no lanza.
  - `validarRango_rechaza32Dias()`: `desde 2026-10-01T00:00`, `hasta 2026-11-01T23:59:59` → `ResponseStatusException` con status 400.
  - `validarRango_rechazaSinFiltroTemporal()`: todo null → 400.
  - `validarRango_rechazaSoloDesde()`: `desde` sin `hasta` y sin `dia` → 400 (la especificación ignora `desde` si viene solo).
  - `validarRango_rechazaHastaAnteriorADesde()` → 400.

  En `DeteccionControllerTest` y `PosicionControllerTest`, agregar `obtenerHistorico_sinFiltroTemporal_retorna400()`: POST con `new PosicionFilter(null, null, null, null)` → `status().isBadRequest()`, y verificar con `verifyNoInteractions` que no se llamó al service.
- [ ] **Paso 2:** `cd /Users/cursor/Dev/dipalza/application_v2.0/dipalza_server/dipalza && ./mvnw -q test -Dtest='PosicionFilterTest,DeteccionControllerTest,PosicionControllerTest'` → FAIL (`validarRango` no existe).
- [ ] **Paso 3:** implementar `validarRango()` en el record:
  - si `dia != null`, es válido;
  - si no, exigir `desde` y `hasta` no nulos y `!hasta.isBefore(desde)`;
  - `ChronoUnit.DAYS.between(desde.toLocalDate(), hasta.toLocalDate()) + 1 <= MAX_DIAS_RANGO`.

  Mensajes:
  - `"Debe indicar 'dia' o el rango 'desde'/'hasta'"`
  - `"'hasta' no puede ser anterior a 'desde'"`
  - `"El rango no puede superar 31 días"`

  Llamar a `filter.validarRango()` como primera línea de `obtenerHistorico` en ambos controllers. `ResponseStatusExceptionHandler` ya existe; verificar que devuelva 400.
- [ ] **Paso 4:** el mismo comando → PASS. Después, la suite completa: `./mvnw -q test` → sin fallos nuevos. Si un test existente manda un filtro sin fecha, corregir el test, no la regla.
- [ ] **Paso 5: commit.** `git add` de los archivos tocados. Mensaje: `feat: los endpoints históricos de posición y paradas exigen fecha y un rango máximo de 31 días`, con la línea `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Tarea 2: Web — dependencias, modelo de paradas y servicio

**Repo:** `/Users/cursor/Dev/dipalza/application_v2.0/dipalza_web_client`, rama `feat/reporte-ubicaciones`.

**Archivos:**
- Modificar: `package.json` y `package-lock.json` (`npm install jspdf@4.2.1 jspdf-autotable@5.0.9 --save-exact`)
- Modificar: `src/app/mapa/models/model.ts`
- Crear: `src/app/mapa/paradas.service.ts`
- Test: `src/app/mapa/paradas.service.spec.ts`

**Interfaces:**
- Produce:
  ```ts
  export interface ParadaVendedorDTO {
    id: number; vendedorId: string; vendedorCodigo: string; vendedorNombre: string;
    latitud: number; longitud: number; calle: string | null;
    horaInicio: string; horaFin: string | null; enCurso: boolean;
  }
  // ParadasService (providedIn root)
  getHistorico(filter: PositionFilter): Observable<ParadaVendedorDTO[]>  // POST `${environment.apiUrl}/deteccion/historico`
  ```

- [ ] **Paso 1:** test `getHistorico hace POST a /deteccion/historico con el filtro`, con el mismo patrón que `positions.service.spec.ts`: `expectOne` por URL, `method === 'POST'`, `request.body` igual al filtro y `flush` de un arreglo con una parada.
- [ ] **Paso 2:** `npx ng test --watch=false --include=src/app/mapa/paradas.service.spec.ts` → FAIL.
- [ ] **Paso 3:** instalar las dependencias exactas, agregar la interfaz y crear el servicio.
- [ ] **Paso 4:** el mismo comando → PASS.
- [ ] **Paso 5: commit.** `feat: servicio de paradas históricas y dependencias para generar PDF`.

---

### Tarea 3: Web — preparación de datos del reporte (funciones puras)

**Archivos:**
- Crear: `src/app/mapa/reporte-ubicaciones/datos-reporte.ts`
- Test: `src/app/mapa/reporte-ubicaciones/datos-reporte.spec.ts`

**Interfaces:**
- Consume: `HistorialPosicionDTO`, `ParadaVendedorDTO` (Tarea 2).
- Produce:
  ```ts
  export const MAX_DIAS_REPORTE = 31;
  export const UMBRAL_AVISO_PAGINAS = 100;
  export interface DiaReporte { fecha: string; posiciones: HistorialPosicionDTO[]; paradas: ParadaVendedorDTO[]; }
  export function agruparPorDia(posiciones: HistorialPosicionDTO[], paradas: ParadaVendedorDTO[]): DiaReporte[];
  export function cantidadDias(desde: string, hasta: string): number;           // inclusivo, YYYY-MM-DD
  export function validarRango(desde: string, hasta: string): string | null;    // mensaje de error o null
  export function superaUmbralAviso(cantidadVendedores: number, dias: number): boolean;
  export function formatearDuracion(inicio: string, fin: string | null, ahora: Date): string; // 'hh:mm'
  export function formatearHora(fechaHora: string): string;                     // 'HH:mm'
  export function formatearFechaLarga(fecha: string): string;                   // 'jueves 6 de noviembre de 2026'
  export function nombreArchivo(desde: string, hasta: string): string;
  export function filtroRango(vendedor: VendedorId, desde: string, hasta: string): PositionFilter;
  ```

- [ ] **Paso 1: tests que fallan**:
  - `agruparPorDia`:
    - con posiciones de dos días, entregadas desordenadas, devuelve 2 días ordenados por `fecha`, con las posiciones de cada día ordenadas por `fechaHora` (caso del foco de revisión 3);
    - cada parada cae en el día de `horaInicio.slice(0,10)`, ordenada por `horaInicio`;
    - una parada de un día sin posiciones se descarta y ese día no aparece;
    - entradas vacías → `[]`.
  - `cantidadDias('2026-10-01','2026-10-31') === 31`, `cantidadDias('2026-11-06','2026-11-06') === 1`.
  - `validarRango`:
    - `('2026-10-01','2026-10-31') === null`;
    - `('2026-10-01','2026-11-01') === 'El rango no puede superar 31 días'`;
    - `('2026-11-06','2026-11-05') === 'La fecha final no puede ser anterior a la inicial'`;
    - `('', '2026-11-05') === 'Debe indicar ambas fechas'`.
  - `superaUmbralAviso(10, 10) === false`, `superaUmbralAviso(10, 11) === true`.
  - `formatearDuracion`:
    - `('2026-11-06T10:00:00','2026-11-06T11:05:00', ahora) === '01:05'`;
    - con `fin = null` y `ahora = 2026-11-06T10:30:00` (hora local) → `'00:30'`.
  - `formatearFechaLarga('2026-11-06') === 'jueves 6 de noviembre de 2026'`. Construir la fecha con `new Date(y, m-1, d)` para no correr el día por UTC.
  - `nombreArchivo('2026-11-06','2026-11-06') === 'reporte-ubicaciones_2026-11-06.pdf'`, `nombreArchivo('2026-10-01','2026-10-31') === 'reporte-ubicaciones_2026-10-01_2026-10-31.pdf'`.
  - `filtroRango({codigo:'001',tipo:'0'},'2026-11-06','2026-11-07')` → `{ vendedorIds:[{codigo:'001',tipo:'0'}], desde:'2026-11-06T00:00:00', hasta:'2026-11-07T23:59:59' }`.
- [ ] **Paso 2:** `npx ng test --watch=false --include=src/app/mapa/reporte-ubicaciones/datos-reporte.spec.ts` → FAIL.
- [ ] **Paso 3:** implementar. Los cálculos de días se hacen sobre fechas `YYYY-MM-DD` construidas en hora local. Ordenar comparando el texto ISO (`localeCompare`) es suficiente.
- [ ] **Paso 4:** el mismo comando → PASS.
- [ ] **Paso 5: commit.** `feat: preparación de datos del reporte de ubicaciones`.

---

### Tarea 4: Web — mapa estático en canvas

**Archivos:**
- Crear: `src/app/mapa/reporte-ubicaciones/mapa-estatico.ts`
- Test: `src/app/mapa/reporte-ubicaciones/mapa-estatico.spec.ts`

**Interfaces:**
- Consume: `DiaReporte` (Tarea 3), `MAPA_CONFIG.tileUrl` (`mapa.config.ts`).
- Produce:
  ```ts
  export const ANCHO_MAPA_PX = 1600;
  export const ALTO_MAPA_PX = 1000;
  export const ZOOM_MAXIMO_REPORTE = 16;
  export interface Encuadre { zoom: number; origen: { x: number; y: number }; } // origen = esquina sup-izq en píxeles del mundo a ese zoom
  export function calcularEncuadre(puntos: { latitud: number; longitud: number }[], ancho: number, alto: number, margenPx: number, zoomMaximo: number): Encuadre;
  export type CargadorMosaico = (url: string) => Promise<CanvasImageSource | null>; // null = no cargó
  export const cargarMosaicoOsm: CargadorMosaico; // new Image(), crossOrigin = 'anonymous', resuelve null en onerror
  export function renderizarMapaDia(dia: DiaReporte, color: string, cargar?: CargadorMosaico): Promise<string>; // dataURL 'image/jpeg', calidad 0.8
  ```

**Algoritmo de `calcularEncuadre`:** proyectar con `L.CRS.EPSG3857.latLngToPoint(L.latLng(lat, lng), z)` y probar desde `zoomMaximo` hacia abajo hasta 0. El primer `z` en que el ancho y el alto del bbox proyectado caben en `ancho - 2*margenPx` y `alto - 2*margenPx` es el zoom. `origen = centroBbox - (ancho/2, alto/2)`. Con un solo punto (bbox de tamaño 0) se obtiene `zoomMaximo`.

**Dibujo en `renderizarMapaDia`:**
1. Recorrer los mosaicos `x ∈ [floor(origen.x/256), floor((origen.x+ancho)/256)]`, y lo mismo en `y`. La URL sale de `MAPA_CONFIG.tileUrl`, reemplazando `{s}` por `'abc'[(x+y)%3]`, `{z}`, `{x}` e `{y}`. Pedirlos en paralelo y dibujarlos en `(x*256 - origen.x, y*256 - origen.y)`. Si el resultado es `null`, rellenar ese cuadro con `#e5e5e5`.
2. Polilínea con todas las posiciones en orden, `lineWidth 5`, `color`, `globalAlpha 0.85`, `lineJoin/lineCap 'round'`.
3. Inicio: círculo de radio 9 `#2ecc71` con borde blanco 2 px. Fin: igual, en `#e74c3c`.
4. Paradas: círculo de radio 13 relleno con `color`, borde blanco 2 px y el número `i+1` centrado en blanco, `bold 14px sans-serif`. El orden es el de `dia.paradas`, el mismo que la tabla.
5. Atribución: rectángulo blanco semitransparente abajo a la derecha con `© colaboradores de OpenStreetMap` (`12px sans-serif`).
6. `canvas.toDataURL('image/jpeg', 0.8)`.

- [ ] **Paso 1: tests que fallan**:
  - `calcularEncuadre con un solo punto devuelve zoomMaximo y centra el punto` (foco 1): proyectar el punto con el zoom obtenido; debe quedar en `(ancho/2, alto/2)` respecto de `origen`, con tolerancia de 1 px.
  - `calcularEncuadre de un recorrido de ~10 km devuelve un zoom menor al máximo y todos los puntos dentro del margen`.
  - `renderizarMapaDia dibuja aunque un mosaico falle` (foco 2): un cargador falso que devuelve `null` para la primera URL y un canvas 1×1 para el resto → resuelve un string que empieza con `data:image/jpeg`. Se espera que el cargador se haya llamado al menos una vez por cada mosaico.
  - `renderizarMapaDia pide mosaicos con el zoom del encuadre`: todas las URLs contienen `/${zoom}/`.
- [ ] **Paso 2:** `npx ng test --watch=false --include=src/app/mapa/reporte-ubicaciones/mapa-estatico.spec.ts` → FAIL.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** el mismo comando → PASS.
- [ ] **Paso 5: commit.** `feat: mapa estático del recorrido diario para el reporte`.

---

### Tarea 5: Web — documento PDF

**Archivos:**
- Crear: `src/app/mapa/reporte-ubicaciones/documento-reporte.ts`
- Test: `src/app/mapa/reporte-ubicaciones/documento-reporte.spec.ts`

**Interfaces:**
- Consume: `DiaReporte`, `formatearDuracion`, `formatearHora`, `formatearFechaLarga` (Tarea 3), `ANCHO_MAPA_PX` y `ALTO_MAPA_PX` (Tarea 4).
- Produce:
  ```ts
  export interface MetaReporte { desde: string; hasta: string; generadoEn: Date; usuario: string | null; }
  export interface VendedorReporte { codigo: string; tipo: string; nombre: string; }
  export const FILAS_INDICE_POR_PAGINA = 30;
  export class DocumentoReporte {
    constructor(meta: MetaReporte, cantidadVendedores: number); // reserva Math.ceil(max(n,1)/30) páginas de índice
    agregarVendedor(vendedor: VendedorReporte, dias: DiaReporte[], imagenes: string[]): void; // imagenes[i] corresponde a dias[i]; dias vacío => fila "sin registros" en el índice, sin páginas
    finalizar(): Blob; // escribe índice y pies "Página N de M", devuelve application/pdf
    get cantidadPaginas(): number;
  }
  ```

**Diseño de página (A4 vertical, mm, márgenes de 15):**
- Portada/índice: título "Reporte de ubicaciones", rango ("6 de noviembre de 2026" o "del … al …"), "Generado el dd-mm-yyyy HH:mm", el usuario si no es null, y una tabla autoTable con las columnas Vendedor, Código, Días con datos, Paradas y Página. En las filas sin datos se muestra "sin registros" en Días y "—" en Página.
- Página de día:
  - Encabezado: la primera página del vendedor muestra el nombre del vendedor, el código y "N días con datos · M paradas"; las siguientes repiten el nombre en pequeño.
  - Debajo: `formatearFechaLarga(fecha)` y "Primera posición HH:mm · Última posición HH:mm · N posiciones".
  - Imagen JPEG con un ancho de 180 mm y el alto proporcional a `ALTO_MAPA_PX/ANCHO_MAPA_PX` (112,5 mm).
  - autoTable de paradas con las columnas N°, Calle, Llegada, Salida y Duración. Calle: `calle ?? '— (lat, lon)'`, con 5 decimales. Salida: `enCurso ? 'en curso' : HH:mm`. Duración: con `(en curso)` si corresponde. `showHead: 'everyPage'`.
  - Sin paradas, el texto "Sin paradas detectadas".
- Pie de cada página (menos el índice): `<nombre vendedor> · <fecha larga>` a la izquierda y `Página N de M` a la derecha. En el índice solo va `Página N de M`. Las páginas de continuación de autoTable heredan el pie del día que las generó: se registra la metadata por número de página en `didDrawPage`.

- [ ] **Paso 1: tests que fallan.** Usar un dataURL JPEG mínimo como imagen y construir el documento con `compress: false` para poder buscar texto en `doc.output()`. Exponer `paraPruebas(): string` o probar sobre el texto del Blob, a elección.
  - `un vendedor con 2 días produce 1 página de índice + 2 páginas` → `cantidadPaginas === 3`.
  - `un vendedor sin días aparece en el índice como "sin registros" y no agrega páginas` → `cantidadPaginas === 1` y el texto contiene `sin registros`.
  - `40 vendedores reservan 2 páginas de índice` (foco 4): con 40 vendedores de 1 día cada uno → `cantidadPaginas === 42`, y el índice muestra para el primer vendedor `Página` 3.
  - `una parada en curso muestra "en curso" y la calle nula muestra coordenadas`.
  - `el pie muestra "Página 2 de 3"`.
- [ ] **Paso 2:** `npx ng test --watch=false --include=src/app/mapa/reporte-ubicaciones/documento-reporte.spec.ts` → FAIL.
- [ ] **Paso 3:** implementar con `import { jsPDF } from 'jspdf'` y `import autoTable from 'jspdf-autotable'`. El índice se escribe en `finalizar()` con `doc.setPage(k)`.
- [ ] **Paso 4:** el mismo comando → PASS. También `npx ng build` sin errores; si el bundle supera el budget, ajustar el budget de `angular.json` y avisarlo en el PR.
- [ ] **Paso 5: commit.** `feat: documento PDF del reporte de ubicaciones`.

---

### Tarea 6: Web — orquestador con progreso y cancelación

**Archivos:**
- Crear: `src/app/mapa/reporte-ubicaciones/reporte-ubicaciones.service.ts`
- Test: `src/app/mapa/reporte-ubicaciones/reporte-ubicaciones.service.spec.ts`

**Interfaces:**
- Consume: `PositionsService.getHistoric`, `ParadasService.getHistorico`, `agruparPorDia`, `filtroRango`, `cantidadDias`, `renderizarMapaDia`, `DocumentoReporte`, `colorForVendedor`.
- Produce:
  ```ts
  export interface ProgresoReporte { vendedorActual: number; totalVendedores: number; diaActual: number; totalDias: number; texto: string; } // texto: 'Vendedor 3 de 12 — día 2 de 5'
  export interface SolicitudReporte { vendedores: VendedorReporte[]; desde: string; hasta: string; usuario: string | null; }
  export class ReporteCancelado extends Error {}
  // ReporteUbicacionesService (providedIn root)
  generar(solicitud: SolicitudReporte, alProgresar: (p: ProgresoReporte) => void, senal: AbortSignal): Promise<{ blob: Blob; nombre: string }>;
  ```

**Comportamiento:**
- Vendedores ordenados por `nombre` (`localeCompare('es')`).
- Por cada uno, en secuencia: `forkJoin` de posiciones y paradas con `filtroRango`, cortado con `takeUntil(fromEvent(senal,'abort'))`. Luego, por cada día, `renderizarMapaDia` con `colorForVendedor(\`${codigo}_${tipo}\`)`, y después `doc.agregarVendedor`.
- Antes de cada vendedor y de cada día, si `senal.aborted`, lanzar `ReporteCancelado`.
- Un error HTTP se propaga como `Error('No se pudieron obtener los datos de <nombre>')`: aborta todo y no hay Blob.
- `nombre` = `nombreArchivo(desde, hasta)`.
- `totalDias` en el progreso es la cantidad de días con datos de ese vendedor (o 0).

- [ ] **Paso 1: tests que fallan** (servicios HTTP falsos con `of(...)` / `throwError` y `renderizarMapaDia` inyectable; exponer el renderizador como propiedad reemplazable del servicio, `renderizador = renderizarMapaDia`):
  - `procesa los vendedores en orden alfabético y llama al renderizador una vez por día con datos`.
  - `informa el progreso "Vendedor 1 de 2 — día 1 de 1"`.
  - `si un vendedor falla, rechaza con "No se pudieron obtener los datos de Juan" y no sigue con el resto`.
  - `si se aborta con una petición en vuelo, rechaza con ReporteCancelado` (foco 5): el servicio falso devuelve un `Subject` que nunca emite; se llama a `controller.abort()` y la promesa debe rechazar con `ReporteCancelado` en lugar de quedar colgada.
- [ ] **Paso 2:** `npx ng test --watch=false --include=src/app/mapa/reporte-ubicaciones/reporte-ubicaciones.service.spec.ts` → FAIL.
- [ ] **Paso 3:** implementar.
- [ ] **Paso 4:** el mismo comando → PASS.
- [ ] **Paso 5: commit.** `feat: orquestador del reporte de ubicaciones con progreso y cancelación`.

---

### Tarea 7: Web — diálogo y botón en la vista del mapa

**Archivos:**
- Crear: `src/app/mapa/reporte-ubicaciones/reporte-ubicaciones-dialog/reporte-ubicaciones-dialog.component.{ts,html,scss,spec.ts}`
- Modificar: `src/app/mapa/vendor-list/vendor-list.component.{ts,html,scss}` (botón y output)
- Modificar: `src/app/mapa/mapa.component.{ts,html}` (abrir el modal)

**Interfaces:**
- Consume: `ReporteUbicacionesService.generar`, `validarRango`, `cantidadDias`, `superaUmbralAviso` y `VendedorListItem[]` (los vendedores que ya tiene `MapaComponent`).
- Produce:
  - `VendorListComponent`: `@Output() reporteSolicitado = new EventEmitter<void>()`.
  - `ReporteUbicacionesDialogComponent`: standalone, abierto con `NgbModal.open(…, { size: 'lg', scrollable: true, backdrop: 'static' })`, con el input `vendedores: VendedorListItem[]` (asignado vía `modalRef.componentInstance.vendedores`).

**Comportamiento del diálogo:**
- Signals:
  - `desde` y `hasta` (por defecto hoy, `new Date().toLocaleDateString('en-CA')`);
  - `seleccionados: Set<string>` (clave `vendedorId_vendedorCodigo`);
  - `generando`, `progreso` y `error`.
- Inputs `type="date"` con etiqueta "Desde" / "Hasta". Debajo, el error de `validarRango` si lo hay.
- Lista de casillas con el punto de color y el nombre, más el botón "Seleccionar todos" / "Quitar todos", que alterna según el estado.
- Aviso (`role="status"`, sin bloquear) si `superaUmbralAviso(seleccionados.size, cantidadDias(desde,hasta))`: "El reporte tendrá muchas páginas: la generación puede tardar varios minutos y el archivo será pesado."
- El botón "Generar PDF" se deshabilita si hay error de rango, si no hay seleccionados o si está `generando`.
- Mientras genera:
  - barra `<progress>` y `progreso().texto` (`aria-live="polite"`);
  - los campos quedan deshabilitados;
  - el botón "Cancelar" llama a `abort()`.
- Al terminar:
  - descarga con `URL.createObjectURL` y un `<a download>`, igual que en `listado-hoja-ruta.component.ts`;
  - `revokeObjectURL`;
  - se cierra el modal.
- Ante `ReporteCancelado`, vuelve al estado editable sin mensaje. Ante otro error, muestra `error.message` y vuelve al estado editable.
- La "X" o el "Cerrar" mientras genera también abortan.
- `usuario`: tomar el nombre del usuario de la sesión si hay un servicio que ya lo exponga (buscar cómo lo muestra la barra superior). Si no, `null`.

**Botón:** en la cabecera de `vendor-list`, a la derecha del título, va un botón de ícono "📄" con `title` y `aria-label` "Reporte de ubicaciones", que emite `reporteSolicitado` con `stopPropagation`, para no colapsar el panel. `MapaComponent` escucha `(reporteSolicitado)="abrirReporte()"` y abre el modal pasando `this.vendedores()`.

- [ ] **Paso 1: tests que fallan** en `reporte-ubicaciones-dialog.component.spec.ts`:
  - `por defecto desde y hasta son hoy y "Generar PDF" está deshabilitado sin vendedores`.
  - `"Seleccionar todos" marca todos y habilita el botón`.
  - `un rango de 32 días muestra "El rango no puede superar 31 días" y deshabilita el botón`.
  - `muestra el aviso de volumen con 10 vendedores y 11 días`.
  - `al generar llama a generar() con los vendedores seleccionados y el rango, y descarga el blob`: servicio falso, spy sobre `URL.createObjectURL`.
  - `cancelar aborta la señal y deja el formulario editable`.

  En `vendor-list.component.spec.ts`: `el botón de reporte emite reporteSolicitado sin colapsar el panel`.
- [ ] **Paso 2:** `npx ng test --watch=false --include='src/app/mapa/**/*.spec.ts'` → FAIL en los nuevos.
- [ ] **Paso 3:** implementar el diálogo, el botón y el cableado en `MapaComponent`.
- [ ] **Paso 4:** el mismo comando → PASS. Después, la suite completa `npx ng test --watch=false`, `npx ng lint` y `npx ng build` → todo verde.
- [ ] **Paso 5: commit.** `feat: diálogo de reporte de ubicaciones en la vista del mapa`.

---

### Tarea 8: Verificación con datos reales y PRs

- [ ] **Paso 1: datos de prueba con paradas.**
  - Los recorridos que hay hoy en la BD no tienen paradas persistidas.
  - Generar al menos 2 vendedores × 2 días enviando posiciones **en orden cronológico** a `POST /api/posicion` de la instancia de **pruebas** (192.168.100.102), nunca producción. Cada recorrido debe incluir al menos 2 detenciones de 12 minutos o más (puntos cada 30 s dentro de 50 m) y tramos de desplazamiento. Usar el simulador de navegación de `dipalza_server` si permite fechas pasadas; si no, un script en el scratchpad.
  - Antes de insertar: SELECT/COUNT de lo que ya existe para esos vendedores y días. Si hay datos inesperados, parar y preguntar.
- [ ] **Paso 2:** levantar la web contra ese backend y generar tres reportes:
  - un día con todos los vendedores;
  - un vendedor con un rango de 31 días;
  - un rango de 32 días: el diálogo lo bloquea. Además, llamar al endpoint a mano con 32 días → 400.
- [ ] **Paso 3:** revisar el PDF:
  - el índice y las páginas de inicio;
  - el recorrido completo;
  - los números de las paradas en el mapa coinciden con la tabla;
  - la atribución OSM;
  - el pie "Página N de M";
  - un vendedor sin datos aparece como "sin registros".

  Cancelar a mitad de un reporte y verificar que no se descarga nada. Imprimir una página en A4 y comprobar que se lee.
- [ ] **Paso 4:** push de ambas ramas y apertura de los PRs:
  - `dipalza_server`: `feat: tope de 31 días en los endpoints históricos de posición y paradas`;
  - `dipalza_web_client`: `feat: reporte de ubicaciones en PDF desde la vista del mapa`.

  En el cuerpo de cada PR, enlazar el otro y aclarar que **el server debe desplegarse junto con la web o antes**, aunque la web funciona igual contra un server sin el tope. Terminar el cuerpo con `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

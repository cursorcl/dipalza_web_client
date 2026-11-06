# Dashboard de metas por vendedor (web) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Una pantalla `/metas`, solo para administradores. Muestra la meta del mes de cada vendedor, lo que lleva vendido y el avance, más dos gráficos de barras: las ventas del mes por día y las de los últimos 12 meses.

**Architecture:** Un `MetaService` consume los endpoints del server. Un componente standalone `MetasComponent` (ruta lazy `metas`, con `AdminGuard`) muestra:
- las cifras del equipo;
- una tabla de vendedores;
- dos gráficos `ng2-charts` (Chart.js).

Los gráficos muestran el equipo o el vendedor que se seleccione. El componente no calcula nada: solo muestra lo que entrega el server.

**Tech Stack:** Angular 20 (standalone, `inject`, `takeUntilDestroyed`), `ng2-charts` 8 / Chart.js 4 (ya registrado con `provideCharts(withDefaultRegisterables())` en `app.config.ts`), locale `es-CL` (ya registrado), Karma + Jasmine con `HttpTestingController`.

**Spec:** `/Users/cursor/Dev/dipalza/application_v2.0/dipalza_server/docs/superpowers/specs/2026-11-05-metas-vendedor-design.md` (sección "### 7. Dashboard web"). El contrato de la API está en la sección 6 y en el server, rama `feat/metas-vendedor`.

## Global Constraints

- **Contrato de la API** (el server ya está implementado; la base es `environment.apiUrl`):
  - `GET /admin/metas` → `TableroEquipo { equipo: TableroMeta, vendedores: MetaVendedorFila[] }`.
  - `GET /admin/metas/vendedor/{codigo}/{tipo}` → `TableroMeta`.
  - `TableroMeta { periodo: string /* "2026-11" */, calculadoEn: string /* ISO */, meta: number | null, vendido: number, avance: number | null, cantidadVentas: number, diario: { fecha: string /* "2026-11-03" */, vendido: number }[], mensual: { periodo: string, vendido: number, meta: number | null }[] }`.
  - `MetaVendedorFila { codigo: string, tipo: string, nombre: string, meta: number | null, vendido: number, avance: number | null, cantidadVentas: number }`.
  - `vendedores` ya viene filtrada (solo activos con meta o ventas) y ordenada por avance, con los null al final. **No se reordena ni se filtra en el cliente.**
  - `diario` trae todos los días del mes en curso y `mensual` trae exactamente 12 meses, con el actual al final.
- **"Sin meta":** `meta === null` o `meta <= 0`, o `avance === null`. Se muestra el texto **"Sin meta"**, nunca `NaN`, `Infinity` ni `0 %`. El cliente **nunca divide**.
- **Montos:** pesos chilenos sin decimales, con formato `$ 12.345.678` (`| number:'1.0-0'` en locale `es-CL`, con el `$ ` delante). Porcentajes con 1 decimal: `61,7 %`.
- **Gráficos de barras:**
  - **Diario:** una barra por día con el vendido. Encima, una línea con el **acumulado** del mes y una línea horizontal con la **meta** del mes cuando existe. El acumulado se calcula en el cliente sumando `diario`; es una suma de presentación, no una regla de negocio.
  - **12 meses:** una barra por mes con el vendido y una línea con la meta de cada mes. Donde la meta es `null`, va un hueco (`spanGaps: false`). El mes en curso se rotula como `"nov 2026 (en curso)"`.
- **Selección:**
  - Por defecto, los gráficos muestran el **equipo**.
  - Al hacer clic en una fila, muestran a ese vendedor con su nombre visible y un botón **"Ver equipo"** para volver.
- **Refresco:** carga al entrar, con un botón **"Actualizar"** y de forma automática cada **5 minutos** (`interval(300_000)`). Si hay un vendedor seleccionado, también se recarga su tablero.
- **Nota visible:** "Se cuentan las ventas transferidas, sin flete, según su fecha de facturación."
- **Estados:**
  - **carga:** indicador mientras llega la primera respuesta;
  - **error:** mensaje "No se pudieron cargar las metas." con un botón para reintentar;
  - **vacío:** si `vendedores` viene vacío, "No hay vendedores con meta o ventas este mes."
- **Acceso:**
  - ruta con `canActivate: [AdminGuard]`;
  - la entrada del menú "Metas de Venta" (icono feather `target`) se oculta si no es admin, con el mismo filtro que `usuarios` en `sidebar.component.ts`.
- **Accesibilidad:**
  - las filas seleccionables se operan con teclado (`tabindex="0"`, Enter o Espacio) y tienen `aria-selected`;
  - el botón de volver tiene un texto claro;
  - los gráficos tienen `aria-label` descriptivo.
- **Estilo del proyecto:** componentes standalone con `inject()`, `takeUntilDestroyed(this.destroyRef)` y el layout con breadcrumb de `listas-precio.component.html`. Todo el texto y los nombres en español.
- **Tests:** `npx ng test --watch=false --browsers=ChromeHeadless`. Build: `npx ng build`.
- **Rama:** `feat/dashboard-metas` (desde `origin/main`). Commits terminan con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Sin push.

## Review Focus

1. **Vendedor sin meta en la tabla y en el gráfico:** la tabla muestra "Sin meta" y la barra de avance queda vacía. El gráfico diario no dibuja la línea de meta. Lo cubren `tabla_sinMeta_muestraSinMeta` y `graficoDiario_sinMeta_noAgregaLineaDeMeta` (Tasks 2 y 3).
2. **Avance mayor a 100 %:** se muestra el valor real (`125,0 %`) y la barra visual se satura en 100 %. Lo cubre `tabla_avanceSobreCien_muestraRealYBarraAl100` (Task 2).
3. **Falla al cargar el tablero de un vendedor seleccionado:** la tabla sigue visible y se muestra el error en la zona de gráficos, sin quedarse en carga infinita. Lo cubre `seleccion_errorDelVendedor_muestraErrorSinPerderTabla` (Task 3).
4. **Refresco automático con el componente destruido:** no siguen saliendo requests después de salir de la pantalla. Lo cubre `refresco_seDetieneAlDestruir`, con `fakeAsync` (Task 3).
5. **Meses sin meta en el gráfico de 12 meses** (los meses previos a la puesta en marcha): la línea de meta tiene huecos y no cae a 0. Lo cubre `graficoMensual_metaNull_dejaHueco` (Task 3).

---

### Task 1: Modelos y `MetaService`

**Files:**
- Create: `src/app/metas/models/meta.models.ts`
- Create: `src/app/metas/meta.service.ts`
- Test: `src/app/metas/meta.service.spec.ts`

**Interfaces:**
- Produces:
  - las interfaces `TableroEquipo`, `TableroMeta`, `VendidoDia`, `VendidoMes` y `MetaVendedorFila`, exactamente como en Global Constraints;
  - `MetaService` (`providedIn: 'root'`), con `tableroEquipo(): Observable<TableroEquipo>` y `tableroVendedor(codigo: string, tipo: string): Observable<TableroMeta>`.

- [ ] **Step 1: Write the failing test.**
  - `tableroEquipo_llamaAlEndpointAdmin`: `expectOne(\`${environment.apiUrl}/admin/metas\`)`, método GET; devuelve la respuesta tal cual.
  - `tableroVendedor_codificaCodigoYTipo`: con `('010','0')` llama a `${environment.apiUrl}/admin/metas/vendedor/010/0`. Los segmentos van con `encodeURIComponent`.
- [ ] **Step 2: Run** `npx ng test --watch=false --browsers=ChromeHeadless --include=src/app/metas/meta.service.spec.ts`. Expected: FAIL (no existe el servicio).
- [ ] **Step 3: Implement** el servicio siguiendo el patrón de `src/app/services/lista-precio.service.ts`.
- [ ] **Step 4: Run** el mismo comando. Expected: PASS.
- [ ] **Step 5: Commit** `feat: servicio y modelos de metas por vendedor`.

### Task 2: Pantalla `/metas` con cifras del equipo y tabla, más ruta y menú

**Files:**
- Create: `src/app/metas/metas.component.ts`, `.html`, `.scss`
- Create: `src/app/metas/formato-metas.ts` (funciones puras de formato)
- Modify: `src/app/app.routes.ts` (ruta `metas`, lazy `loadComponent`, `canActivate: [AdminGuard]`)
- Modify: `src/assets/data/routes.json` (entrada `{ "path": "metas", "title": "Metas de Venta", "iconType": "feather", "icon": "target", ... }`, con la misma forma que `listas-precio`)
- Modify: `src/app/layout/sidebar/sidebar.component.ts:105` (también se oculta `metas` si no es admin)
- Test: `src/app/metas/formato-metas.spec.ts`, `src/app/metas/metas.component.spec.ts`; ampliar `src/app/layout/sidebar/sidebar.component.spec.ts`

**Interfaces:**
- Consumes: `MetaService.tableroEquipo()` y los modelos (Task 1).
- Produces:
  - `formato-metas.ts`:
    - `formatearPesos(valor: number | null): string`, que da `"$ 12.345.678"` o `"—"` si es null;
    - `formatearAvance(avance: number | null): string`, que da `"61,7 %"` o `"Sin meta"`;
    - `anchoBarraAvance(avance: number | null): number`, entre 0 y 100, saturado en 100 y 0 si es null;
    - `tieneMeta(meta: number | null): boolean`.
  - En `MetasComponent`:
    - `tablero: TableroEquipo | null`, `cargando: boolean` y `error: string | null`;
    - `seleccionado: MetaVendedorFila | null`, que se completa en la Task 3;
    - `cargar(): void`.

- [ ] **Step 1: Write the failing tests.**
  - `formato-metas.spec.ts`:
    - `formatearPesos(12345678)` → `'$ 12.345.678'`;
    - `formatearPesos(null)` → `'—'`;
    - `formatearAvance(61.7)` → `'61,7 %'`;
    - `formatearAvance(null)` → `'Sin meta'`;
    - `anchoBarraAvance(125)` → `100`;
    - `anchoBarraAvance(null)` → `0`;
    - `tieneMeta(0)` → `false`.
  - `metas.component.spec.ts`, con `HttpTestingController` y un `TableroEquipo` de 3 vendedores (uno con avance 125, uno con meta null y avance null, uno normal):
    - `carga_muestraCifrasDelEquipo`: aparecen la meta total, el vendido total y el avance global formateados.
    - `tabla_muestraVendedoresEnElOrdenRecibido`.
    - `tabla_sinMeta_muestraSinMeta`.
    - `tabla_avanceSobreCien_muestraRealYBarraAl100`: el texto dice `125,0 %` y el `style.width` de la barra es `100%`.
    - `vacio_muestraMensaje`: con `vendedores: []` muestra "No hay vendedores con meta o ventas este mes."
    - `error_muestraMensajeYReintenta`: un 500 muestra "No se pudieron cargar las metas."; el botón reintentar vuelve a pedir `/admin/metas`.
    - `muestraNotaDeVentasContadas`: aparece el texto exacto de la nota.
  - `sidebar.component.spec.ts`: `excluye "Metas de Venta" cuando el usuario no es admin` e `incluye ... cuando es admin`.
- [ ] **Step 2: Run** `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/{metas,layout/sidebar}/**/*.spec.ts'`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Layout con breadcrumb "Metas de Venta", como `listas-precio.component.html`.
  - Arriba, tres tarjetas: Meta del equipo, Vendido y Avance, con el periodo ("noviembre 2026") y "Actualizado a las HH:mm" (de `calculadoEn`).
  - Tabla HTML simple (`table table-hover`) con Vendedor, Meta, Vendido, Avance (barra Bootstrap `progress` + texto) y Ventas.
  - La nota y los estados de carga, error y vacío.
  - Botón "Actualizar" que llama a `cargar()`.
- [ ] **Step 4: Run** el mismo comando. Expected: PASS.
- [ ] **Step 5: Run** `npx ng build`. Expected: compila sin errores.
- [ ] **Step 6: Commit** `feat: pantalla de metas con cifras del equipo y tabla por vendedor`.

### Task 3: Gráficos, selección de vendedor y refresco automático

**Files:**
- Create: `src/app/metas/graficos-metas.ts` (funciones puras que arman el `ChartConfiguration` de cada gráfico)
- Modify: `src/app/metas/metas.component.ts`, `.html`, `.scss`
- Test: `src/app/metas/graficos-metas.spec.ts`; ampliar `src/app/metas/metas.component.spec.ts`

**Interfaces:**
- Consumes: `MetaService.tableroVendedor(codigo, tipo)` (Task 1); `tablero`, `seleccionado` y `cargar()` (Task 2).
- Produces:
  - `graficoDiario(t: TableroMeta): ChartConfiguration<'bar' | 'line'>`, con 2 datasets (barras de vendido y línea de acumulado), más un tercero (línea constante de meta) solo si `tieneMeta(t.meta)`. Las etiquetas son el número de día (`"1"`…`"30"`).
  - `graficoMensual(t: TableroMeta): ChartConfiguration<'bar' | 'line'>`, con barras de vendido y una línea de meta con `null` donde no hay. Las etiquetas son `"dic 2025"`…`"nov 2026 (en curso)"`.
  - En `MetasComponent`:
    - `seleccionar(fila: MetaVendedorFila): void` y `verEquipo(): void`;
    - `tableroGraficos: TableroMeta | null`, que es el del equipo o el del vendedor;
    - `errorGraficos: string | null`.

- [ ] **Step 1: Write the failing tests.**
  - `graficos-metas.spec.ts`:
    - `graficoDiario_acumuladoEsSumaCorrida`: con vendidos `[100, 0, 50]`, el acumulado es `[100, 100, 150]`.
    - `graficoDiario_sinMeta_noAgregaLineaDeMeta`: 2 datasets.
    - `graficoDiario_conMeta_lineaConstante`: el tercer dataset tiene todos los valores igual a la meta.
    - `graficoMensual_metaNull_dejaHueco`: un `null` en la meta se conserva como `null` (no 0), con `spanGaps: false`.
    - `graficoMensual_ultimaEtiquetaMarcaEnCurso`: la última etiqueta termina en `"(en curso)"`.
  - `metas.component.spec.ts`:
    - `graficos_porDefectoMuestranEquipo`.
    - `seleccion_cargaTableroDelVendedorYMuestraNombre`: un clic en la fila `010` pide `/admin/metas/vendedor/010/0` y aparece el nombre del vendedor junto al botón "Ver equipo".
    - `seleccion_conTeclado`: Enter sobre la fila también selecciona.
    - `verEquipo_vuelveAlTableroDelEquipo`: no hace un request nuevo y usa `tablero.equipo`.
    - `seleccion_errorDelVendedor_muestraErrorSinPerderTabla`.
    - `refresco_cadaCincoMinutos` (`fakeAsync`, `tick(300_000)`): vuelve a pedir `/admin/metas`, y también el vendedor si hay uno seleccionado.
    - `refresco_seDetieneAlDestruir`: después de `fixture.destroy()` y `tick(300_000)`, `httpMock.expectNone(...)`.
- [ ] **Step 2: Run** `npx ng test --watch=false --browsers=ChromeHeadless --include='src/app/metas/**/*.spec.ts'`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Usar `BaseChartDirective` de `ng2-charts` (`<canvas baseChart [data] [options] [type]="'bar'" aria-label="...">`).
  - Gráficos mixtos: los datasets de línea llevan `type: 'line'`.
  - El tooltip y el eje Y formatean con `formatearPesos`.
  - Refresco con `interval(300_000).pipe(takeUntilDestroyed(this.destroyRef))`.
  - Cada carga de la selección descarta la respuesta anterior (`switchMap`).
- [ ] **Step 4: Run** el mismo comando. Expected: PASS.
- [ ] **Step 5: Run** la suite completa `npx ng test --watch=false --browsers=ChromeHeadless` y `npx ng build`. Expected: todo en verde.
- [ ] **Step 6: Verificar en vivo.** Con el server de la rama `feat/metas-vendedor` corriendo en `localhost:8080` (perfiles `dev-sec,dev-pruebas`) y `ng serve` en `:4200`, el usuario entra como admin a `/#/metas`. Se revisan las cifras contra `curl /api/admin/metas`. Este paso lo hace el usuario, que tiene la sesión.
- [ ] **Step 7: Commit** `feat: gráficos de ventas diarias y mensuales en el dashboard de metas`.

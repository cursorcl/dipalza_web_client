# Recorrido del día por vendedor (selección múltiple) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir ver el recorrido del día de varios vendedores a la vez en el mapa (Leaflet), controlado por un checkbox por vendedor en la lista y sincronizado con el clic en su marker.

**Architecture:** `MapaComponent` mantiene un `Map<string, L.LayerGroup>` (una capa por vendedor visible) y un `Set<string>` reactivo (`seleccionados`) con la clave `${codigo}_${tipo}`. Un único método `toggleTrayectoria(...)` agrega o quita la capa de un vendedor y actualiza el `Set`; tanto el clic en el marker como el checkbox de `VendorListComponent` llaman a este mismo método, y el checkbox refleja el `Set` vía `@Input selectedIds`.

**Tech Stack:** Angular 20 (standalone components, signals), Leaflet (`L.polyline`, `L.circleMarker`, `L.layerGroup`), Jasmine + Karma (`npx ng test`), `HttpClientTesting`.

## Global Constraints

- No se agrega ninguna dependencia npm nueva (el toast se implementa a mano, sin `ngx-toastr` ni Angular Material).
- No se modifica el backend: el endpoint `POST /api/posicion/historico` ya soporta filtro por `vendedorIds` + `dia`.
- La clave de identidad de un vendedor en todo el módulo `mapa` es `${codigo}_${tipo}` — misma convención que ya usa `colorForVendedor`, no se introduce un segundo esquema.
- El doble clic en una fila de la lista mantiene su comportamiento actual (solo `centrarEnVendedor`, sin tocar trayectorias) — no se toca `centrarEnVendedor` ni el `@Output vendedorSeleccionado` existente.
- Ejecutar pruebas con `npx ng test --watch=false` desde `dipalza_web_client/`; Karma abre Chrome real, revisar la salida de terminal para confirmar PASS/FAIL de cada test por nombre.

---

### Task 1: `VendorListComponent` — checkbox de selección de trayectoria

**Files:**
- Modify: `src/app/mapa/vendor-list/vendor-list.component.ts`
- Modify: `src/app/mapa/vendor-list/vendor-list.component.html`
- Modify: `src/app/mapa/vendor-list/vendor-list.component.scss`
- Test: `src/app/mapa/vendor-list/vendor-list.component.spec.ts`

**Interfaces:**
- Consumes: `VendedorListItem` (ya existe en `../models/model`, campos `vendedorId`, `vendedorCodigo`, `vendedorNombre`, `color`, `fechaHora`, `tiempoRelativo`, `online`).
- Produces: `@Input() selectedIds: Set<string>`, `@Output() trayectoriaToggled = new EventEmitter<VendedorListItem>()`, método `isSelected(vendedor: VendedorListItem): boolean`. El `@Output() vendedorSeleccionado` y `onDoubleClick` existentes no cambian.

- [ ] **Step 1: Escribir los tests que fallan**

Agregar, dentro del `describe('VendorListComponent', ...)` existente, justo antes del `});` final de `vendor-list.component.spec.ts`:

```typescript
  it('el checkbox refleja si la clave del vendedor está en selectedIds', () => {
    component.vendedores = [vendedorEjemplo];
    component.selectedIds = new Set(['001_0']);
    fixture.detectChanges();

    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.vendor-list__checkbox');
    expect(checkbox.checked).toBeTrue();
  });

  it('el checkbox aparece sin marcar si la clave no está en selectedIds', () => {
    component.vendedores = [vendedorEjemplo];
    component.selectedIds = new Set();
    fixture.detectChanges();

    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.vendor-list__checkbox');
    expect(checkbox.checked).toBeFalse();
  });

  it('emite trayectoriaToggled con el vendedor completo al cambiar el checkbox', () => {
    component.vendedores = [vendedorEjemplo];
    fixture.detectChanges();

    const emitidos: VendedorListItem[] = [];
    component.trayectoriaToggled.subscribe((v) => emitidos.push(v));

    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.vendor-list__checkbox');
    checkbox.dispatchEvent(new Event('change'));

    expect(emitidos).toEqual([vendedorEjemplo]);
  });
```

`vendedorEjemplo` ya existe en el archivo (`vendedorId: '001', vendedorCodigo: '0', ...`), por eso la clave esperada es `'001_0'`.

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `npx ng test --watch=false`
Expected: FAIL — no existe `.vendor-list__checkbox` en el DOM, `selectedIds` y `trayectoriaToggled` no existen en el componente (error de compilación TypeScript).

- [ ] **Step 3: Implementar `vendor-list.component.ts`**

Reemplazar el contenido completo por:

```typescript
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { VendedorListItem } from '../models/model';

@Component({
  selector: 'app-vendor-list',
  imports: [],
  templateUrl: './vendor-list.component.html',
  styleUrl: './vendor-list.component.scss'
})
export class VendorListComponent {
  @Input() vendedores: VendedorListItem[] = [];
  @Input() selectedIds: Set<string> = new Set();
  @Output() vendedorSeleccionado = new EventEmitter<string>();
  @Output() trayectoriaToggled = new EventEmitter<VendedorListItem>();

  onDoubleClick(vendedorId: string): void {
    this.vendedorSeleccionado.emit(vendedorId);
  }

  isSelected(vendedor: VendedorListItem): boolean {
    return this.selectedIds.has(`${vendedor.vendedorId}_${vendedor.vendedorCodigo}`);
  }

  onToggleTrayectoria(vendedor: VendedorListItem): void {
    this.trayectoriaToggled.emit(vendedor);
  }
}
```

- [ ] **Step 4: Implementar `vendor-list.component.html`**

Reemplazar el contenido completo por:

```html
<div class="vendor-list">
  @for (vendedor of vendedores; track vendedor.vendedorId) {
    <div class="vendor-list__item" (dblclick)="onDoubleClick(vendedor.vendedorId)">
      <input
        type="checkbox"
        class="vendor-list__checkbox"
        [checked]="isSelected(vendedor)"
        (change)="onToggleTrayectoria(vendedor)"
        (dblclick)="$event.stopPropagation()" />
      <span class="vendor-list__dot" [style.background-color]="vendedor.color"></span>
      <div class="vendor-list__info">
        <span class="vendor-list__nombre">{{ vendedor.vendedorNombre }}</span>
        <span class="vendor-list__tiempo">{{ vendedor.tiempoRelativo }}</span>
      </div>
      <span
        class="vendor-list__estado"
        [class.vendor-list__estado--online]="vendedor.online"
        [title]="vendedor.online ? 'Online' : 'Offline'">
      </span>
    </div>
  }
</div>
```

(`(dblclick)="$event.stopPropagation()"` en el checkbox evita que dos clics rápidos sobre él disparen también el `dblclick` de la fila, que centraría el mapa de forma inesperada.)

- [ ] **Step 5: Agregar estilo del checkbox en `vendor-list.component.scss`**

Agregar al final del archivo:

```scss
.vendor-list__checkbox {
    flex-shrink: 0;
    cursor: pointer;
}
```

- [ ] **Step 6: Ejecutar y verificar que pasan**

Run: `npx ng test --watch=false`
Expected: PASS para los 3 tests nuevos y para los tests preexistentes de `VendorListComponent` (`should create`, `renderiza una fila...`, `emite vendedorSeleccionado...`).

- [ ] **Step 7: Commit**

```bash
git add src/app/mapa/vendor-list/vendor-list.component.ts src/app/mapa/vendor-list/vendor-list.component.html src/app/mapa/vendor-list/vendor-list.component.scss src/app/mapa/vendor-list/vendor-list.component.spec.ts
git commit -m "feat: agrega checkbox de selección de trayectoria en la lista de vendedores"
```

---

### Task 2: `MapaComponent` — scaffold del toast y reestructuración del layout

**Files:**
- Modify: `src/app/mapa/mapa.component.ts`
- Modify: `src/app/mapa/mapa.component.html`
- Modify: `src/app/mapa/mapa.component.scss`
- Test: `src/app/mapa/mapa.component.spec.ts`

**Interfaces:**
- Produces: `toastMensaje = signal<string | null>(null)` (público, lo usará el toggle de trayectoria en la Task 5), `private toastTimeout?: ReturnType<typeof setTimeout>`.
- Consumes: nada nuevo.

- [ ] **Step 1: Escribir los tests que fallan**

Agregar, dentro del `describe('MapaComponent', ...)` existente, antes del `});` final de `mapa.component.spec.ts`:

```typescript
  it('no muestra el toast cuando toastMensaje es null', () => {
    fixture.detectChanges();
    const toast = fixture.nativeElement.querySelector('.mapa-toast');
    expect(toast).toBeNull();
  });

  it('muestra el mensaje en pantalla cuando toastMensaje tiene un valor', () => {
    component.toastMensaje.set('Sin recorrido registrado hoy para Juan Perez');
    fixture.detectChanges();

    const toast = fixture.nativeElement.querySelector('.mapa-toast');
    expect(toast.textContent).toContain('Sin recorrido registrado hoy para Juan Perez');
  });
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `npx ng test --watch=false`
Expected: FAIL — `toastMensaje` no existe en `MapaComponent` (error de compilación).

- [ ] **Step 3: Agregar los campos en `mapa.component.ts`**

Ubicar el bloque de campos (justo después de `private padronVendedores: VendedorDTO[] = [];`, línea 32 del archivo actual) y agregar debajo:

```typescript
  toastMensaje = signal<string | null>(null);
  private toastTimeout?: ReturnType<typeof setTimeout>;
```

En `ngOnDestroy()`, agregar la limpieza del timeout junto a la del `tooltipRefreshInterval`:

```typescript
  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.tooltipRefreshInterval) {
      clearInterval(this.tooltipRefreshInterval);
    }
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    // No desconectamos el WebSocket acá: WSPositionService es un singleton
    // root, se mantiene conectado durante toda la sesión de la app en vez
    // de reconectarse cada vez que se entra a esta página.
  }
```

- [ ] **Step 4: Reestructurar `mapa.component.html`**

Reemplazar el contenido completo por:

```html
<section class="main-content">
<div class="mapa-layout">
  <div class="map-wrapper">
    <div class="map-container" #map></div>
    @if (toastMensaje(); as mensaje) {
      <div class="mapa-toast">{{ mensaje }}</div>
    }
  </div>
  <app-vendor-list
    [vendedores]="vendedores()"
    (vendedorSeleccionado)="centrarEnVendedor($event)">
  </app-vendor-list>
</div>
</section>
```

(El binding `[selectedIds]` y `(trayectoriaToggled)` de `<app-vendor-list>` se agregan en la Task 8, cuando `seleccionados` y `toggleTrayectoria` ya existan.)

- [ ] **Step 5: Reestructurar `mapa.component.scss`**

Reemplazar el contenido completo por (esto también elimina el bloque de reglas `.tooltip-vendedor-clean` / `.label-minimal` que estaba duplicado dos veces en el archivo original):

```scss
.mapa-layout {
    display: flex;
    height: calc(100vh - 100px);
    width: 100%;
}

.map-wrapper {
    flex: 1 1 auto;
    height: 100%;
    position: relative;
}

.map-container {
    width: 100%;
    height: 100%;
}

.mapa-toast {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    background-color: rgba(44, 62, 80, 0.92);
    color: #ffffff;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 13px;
    z-index: 1000;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

/* Elimina el cuadro blanco, bordes y sombras del tooltip de Leaflet */
::ng-deep .tooltip-vendedor-clean {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
}

/* Elimina la flecha/triángulo del tooltip */
::ng-deep .tooltip-vendedor-clean::before {
    display: none !important;
}

/* Estiliza el texto para legibilidad */
::ng-deep .label-minimal {
    text-align: center;
    /* El shadow permite leer el texto sin necesidad de un cuadro de fondo */
    text-shadow: 1px 1px 1px white, -1px -1px 1px white, 0 0 5px white;
}

::ng-deep .label-minimal .nombre {
    font-weight: bold;
    font-size: 13px;
    color: #2c3e50;
    line-height: 1;
}

::ng-deep .label-minimal .tiempo {
    font-size: 11px;
    color: #d35400;
    font-weight: 600;
}
```

- [ ] **Step 6: Ejecutar y verificar que pasan**

Run: `npx ng test --watch=false`
Expected: PASS para los 2 tests nuevos y para toda la suite preexistente de `MapaComponent`.

- [ ] **Step 7: Commit**

```bash
git add src/app/mapa/mapa.component.ts src/app/mapa/mapa.component.html src/app/mapa/mapa.component.scss src/app/mapa/mapa.component.spec.ts
git commit -m "feat: agrega scaffold de toast y limpia CSS duplicado en MapaComponent"
```

---

### Task 3: `toggleTrayectoria` — selección dibuja el recorrido del día

**Files:**
- Modify: `src/app/mapa/mapa.component.ts`
- Test: `src/app/mapa/mapa.component.spec.ts`

**Interfaces:**
- Consumes: `PositionsService.getHistoric(filter: PositionFilter): Observable<HistorialPosicionDTO[]>` (ya existe), `colorForVendedor(key: string): string` (ya existe), tipos `VendedorId`, `PositionFilter`, `HistorialPosicionDTO` de `./models/model`.
- Produces: `private trayectoriasPorVendedor: Map<string, L.LayerGroup>`, `seleccionados = signal<Set<string>>(new Set())` (público), `toggleTrayectoria(vendedor: VendedorId & { nombre: string }): void` (público), `private mostrarTrayectoria(key: string, puntos: HistorialPosicionDTO[]): void`.

- [ ] **Step 1: Escribir el test que falla**

Agregar en `mapa.component.spec.ts`, antes del `});` final:

```typescript
  it('toggleTrayectoria dibuja el recorrido del día y lo agrega a seleccionados', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });

    const req = httpMock.expectOne(`${environment.apiUrl}/posicion/historico`);
    expect(req.request.method).toBe('POST');
    req.flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 },
      { id: 2, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:05:00', latitud: -33.41, longitud: -70.61 }
    ]);

    expect(component.seleccionados().has('001_0')).toBeTrue();
  });
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npx ng test --watch=false`
Expected: FAIL — `toggleTrayectoria` no existe en `MapaComponent` (error de compilación).

- [ ] **Step 3: Actualizar el import de tipos**

En la línea 4 de `mapa.component.ts`, reemplazar:

```typescript
import { HistorialPosicionDTO, PosicionDTO, VendedorDTO, VendedorListItem } from './models/model';
```

por:

```typescript
import { HistorialPosicionDTO, PosicionDTO, PositionFilter, VendedorDTO, VendedorId, VendedorListItem } from './models/model';
```

- [ ] **Step 4: Agregar los nuevos campos**

Justo debajo de `private padronVendedores: VendedorDTO[] = [];` (junto a `toastMensaje`/`toastTimeout` agregados en la Task 2), agregar:

```typescript
  private trayectoriasPorVendedor: Map<string, L.LayerGroup> = new Map();
  seleccionados = signal<Set<string>>(new Set());
```

- [ ] **Step 5: Implementar `toggleTrayectoria` y `mostrarTrayectoria`**

Agregar estos dos métodos nuevos en la clase (por ejemplo, después de `getBoundarys()` y antes de `createCustomIcon()`; **no borrar todavía** `showHistory`, `groupBySeller` ni `consultarYDibujarTrayectoriaDia` — se eliminan en la Task 7):

```typescript
  toggleTrayectoria(vendedor: VendedorId & { nombre: string }): void {
    const key = `${vendedor.codigo}_${vendedor.tipo}`;
    const hoy = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const filter: PositionFilter = {
      vendedorIds: [{ codigo: vendedor.codigo, tipo: vendedor.tipo }],
      dia: hoy
    };

    this.positionService.getHistoric(filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(puntos => {
        this.mostrarTrayectoria(key, puntos);
      });
  }

  private mostrarTrayectoria(key: string, puntos: HistorialPosicionDTO[]): void {
    const color = colorForVendedor(key);
    const grupo = L.layerGroup();
    const coordenadas = puntos.map(p => [p.latitud, p.longitud]) as L.LatLngExpression[];

    const polyline = L.polyline(coordenadas, {
      color,
      weight: 5,
      opacity: 0.8,
      smoothFactor: 1
    });
    polyline.bindPopup(`<b>Recorrido de hoy:</b> ${puntos[0].vendedorNombre}`);
    polyline.addTo(grupo);

    puntos.forEach((punto, index) => {
      const esInicio = index === 0;
      const esFin = index === puntos.length - 1;
      const hora = new Date(punto.fechaHora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

      const circulo = L.circleMarker([punto.latitud, punto.longitud], {
        radius: esInicio || esFin ? 7 : 4,
        color: '#ffffff',
        weight: esInicio || esFin ? 2 : 1,
        fillColor: color,
        fillOpacity: esInicio || esFin ? 1 : 0.6
      });

      const etiqueta = esInicio ? `Inicio — ${hora}` : esFin ? `Última posición — ${hora}` : hora;
      circulo.bindPopup(etiqueta);
      circulo.addTo(grupo);
    });

    grupo.addTo(this.historialLayer);
    this.trayectoriasPorVendedor.set(key, grupo);

    const actualizado = new Set(this.seleccionados());
    actualizado.add(key);
    this.seleccionados.set(actualizado);
  }
```

- [ ] **Step 6: Ejecutar y verificar que pasa**

Run: `npx ng test --watch=false`
Expected: PASS para el test nuevo y toda la suite preexistente.

- [ ] **Step 7: Commit**

```bash
git add src/app/mapa/mapa.component.ts src/app/mapa/mapa.component.spec.ts
git commit -m "feat: toggleTrayectoria dibuja el recorrido del día de un vendedor"
```

---

### Task 4: `toggleTrayectoria` — deseleccionar oculta el recorrido

**Files:**
- Modify: `src/app/mapa/mapa.component.ts`
- Test: `src/app/mapa/mapa.component.spec.ts`

**Interfaces:**
- Consumes: `trayectoriasPorVendedor`, `seleccionados`, `historialLayer` de la Task 3.
- Produces: rama de remoción dentro de `toggleTrayectoria` (mismo método, sin nueva firma pública).

- [ ] **Step 1: Escribir el test que falla**

```typescript
  it('toggleTrayectoria oculta el recorrido si ya estaba visible', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 },
      { id: 2, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:05:00', latitud: -33.41, longitud: -70.61 }
    ]);
    expect(component.seleccionados().has('001_0')).toBeTrue();

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });

    expect(component.seleccionados().has('001_0')).toBeFalse();
    httpMock.expectNone(`${environment.apiUrl}/posicion/historico`);
  });
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npx ng test --watch=false`
Expected: FAIL — la segunda llamada a `toggleTrayectoria` vuelve a hacer un POST (la aserción `httpMock.expectNone(...)` falla) y `seleccionados` sigue teniendo `'001_0'`.

- [ ] **Step 3: Implementar la rama de remoción**

Reemplazar el método `toggleTrayectoria` completo (el que quedó de la Task 3) por:

```typescript
  toggleTrayectoria(vendedor: VendedorId & { nombre: string }): void {
    const key = `${vendedor.codigo}_${vendedor.tipo}`;

    if (this.trayectoriasPorVendedor.has(key)) {
      const layer = this.trayectoriasPorVendedor.get(key)!;
      this.historialLayer.removeLayer(layer);
      this.trayectoriasPorVendedor.delete(key);

      const actualizado = new Set(this.seleccionados());
      actualizado.delete(key);
      this.seleccionados.set(actualizado);
      return;
    }

    const hoy = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD
    const filter: PositionFilter = {
      vendedorIds: [{ codigo: vendedor.codigo, tipo: vendedor.tipo }],
      dia: hoy
    };

    this.positionService.getHistoric(filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(puntos => {
        this.mostrarTrayectoria(key, puntos);
      });
  }
```

(Es el mismo método de la Task 3, con el bloque `if (this.trayectoriasPorVendedor.has(key)) { ... }` agregado al inicio.)

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npx ng test --watch=false`
Expected: PASS para el test nuevo y toda la suite preexistente (incluyendo el de la Task 3, que sigue verificando la selección).

- [ ] **Step 5: Commit**

```bash
git add src/app/mapa/mapa.component.ts src/app/mapa/mapa.component.spec.ts
git commit -m "feat: toggleTrayectoria oculta el recorrido al deseleccionar un vendedor"
```

---

### Task 5: `toggleTrayectoria` — sin recorrido hoy muestra un toast

**Files:**
- Modify: `src/app/mapa/mapa.component.ts`
- Test: `src/app/mapa/mapa.component.spec.ts`

**Interfaces:**
- Consumes: `toastMensaje`, `toastTimeout` (Task 2), `toggleTrayectoria` (Task 3/4).
- Produces: rama de histórico vacío dentro de `toggleTrayectoria` (sin nueva firma pública).

- [ ] **Step 1: Escribir los tests que fallan**

```typescript
  it('toggleTrayectoria muestra un toast si no hay recorrido para hoy', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '002', tipo: '0', nombre: 'Ana Soto' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([]);

    expect(component.toastMensaje()).toBe('Sin recorrido registrado hoy para Ana Soto');
    expect(component.seleccionados().has('002_0')).toBeFalse();
  });

  it('el toast se oculta automáticamente después de 3 segundos', () => {
    jasmine.clock().install();
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '002', tipo: '0', nombre: 'Ana Soto' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([]);
    expect(component.toastMensaje()).not.toBeNull();

    jasmine.clock().tick(3000);
    expect(component.toastMensaje()).toBeNull();

    jasmine.clock().uninstall();
  });
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `npx ng test --watch=false`
Expected: FAIL — con histórico vacío, `mostrarTrayectoria` intenta leer `puntos[0].vendedorNombre` de un arreglo vacío (`undefined`), `toastMensaje` queda en `null`.

- [ ] **Step 3: Implementar la rama de histórico vacío**

Dentro del `.subscribe(puntos => { ... })` de `toggleTrayectoria`, agregar la comprobación antes de llamar a `mostrarTrayectoria`:

```typescript
    this.positionService.getHistoric(filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(puntos => {
        if (puntos.length === 0) {
          if (this.toastTimeout) {
            clearTimeout(this.toastTimeout);
          }
          this.toastMensaje.set(`Sin recorrido registrado hoy para ${vendedor.nombre}`);
          this.toastTimeout = setTimeout(() => this.toastMensaje.set(null), 3000);
          return;
        }
        this.mostrarTrayectoria(key, puntos);
      });
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `npx ng test --watch=false`
Expected: PASS para los 2 tests nuevos y toda la suite preexistente.

- [ ] **Step 5: Commit**

```bash
git add src/app/mapa/mapa.component.ts src/app/mapa/mapa.component.spec.ts
git commit -m "feat: muestra un toast cuando un vendedor no tiene recorrido hoy"
```

---

### Task 6: Selección múltiple — la vista se ajusta a todas las trayectorias visibles

**Files:**
- Modify: `src/app/mapa/mapa.component.ts`
- Test: `src/app/mapa/mapa.component.spec.ts`

**Interfaces:**
- Consumes: `trayectoriasPorVendedor`, `mostrarTrayectoria` (Task 3).
- Produces: `private ajustarVistaATrayectoriasVisibles(): void`.

- [ ] **Step 1: Escribir el test que falla**

Agregar `import * as L from 'leaflet';` al inicio de `mapa.component.spec.ts` (junto a los demás imports), y luego el test:

```typescript
  it('al seleccionar dos vendedores, la vista se ajusta para mostrar ambos recorridos', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 }
    ]);

    component.toggleTrayectoria({ codigo: '002', tipo: '0', nombre: 'Ana Soto' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 2, vendedorId: '002', vendedorCodigo: '0', vendedorNombre: 'Ana Soto', fechaHora: '2026-07-26T09:00:00', latitud: -34.00, longitud: -71.00 }
    ]);

    expect(component.seleccionados().has('001_0')).toBeTrue();
    expect(component.seleccionados().has('002_0')).toBeTrue();

    const mapBounds = (component as any).map.getBounds();
    expect(mapBounds.contains(L.latLng(-33.40, -70.60))).toBeTrue();
    expect(mapBounds.contains(L.latLng(-34.00, -71.00))).toBeTrue();
  });
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npx ng test --watch=false`
Expected: FAIL — el mapa nunca se mueve al llamar `toggleTrayectoria` (no hay `fitBounds`), por lo que sigue centrado en su vista inicial y no contiene ambos puntos (que están a >100km de distancia entre sí).

- [ ] **Step 3: Implementar `ajustarVistaATrayectoriasVisibles` y llamarla desde `mostrarTrayectoria`**

Al final de `mostrarTrayectoria` (después de `this.seleccionados.set(actualizado);`), agregar la llamada:

```typescript
    const actualizado = new Set(this.seleccionados());
    actualizado.add(key);
    this.seleccionados.set(actualizado);

    this.ajustarVistaATrayectoriasVisibles();
  }
```

Y agregar el nuevo método privado justo después de `mostrarTrayectoria`:

```typescript
  private ajustarVistaATrayectoriasVisibles(): void {
    const bounds = L.latLngBounds([]);
    this.trayectoriasPorVendedor.forEach(grupo => {
      grupo.eachLayer(capa => {
        if (capa instanceof L.Polyline) {
          bounds.extend(capa.getBounds());
        }
      });
    });
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }
```

- [ ] **Step 4: Ejecutar y verificar que pasa**

Run: `npx ng test --watch=false`
Expected: PASS para el test nuevo y toda la suite preexistente.

- [ ] **Step 5: Commit**

```bash
git add src/app/mapa/mapa.component.ts src/app/mapa/mapa.component.spec.ts
git commit -m "feat: ajusta la vista del mapa a todas las trayectorias visibles"
```

---

### Task 7: Marker del mapa usa `toggleTrayectoria` y se elimina el código muerto

**Files:**
- Modify: `src/app/mapa/mapa.component.ts`
- Test: `src/app/mapa/mapa.component.spec.ts`

**Interfaces:**
- Consumes: `toggleTrayectoria` (Tasks 3-6).
- Produces: ninguna interfaz nueva; elimina `showHistory`, `groupBySeller`, `consultarYDibujarTrayectoriaDia`.

- [ ] **Step 1: Escribir el test que falla**

```typescript
  it('el clic en el marker de un vendedor dibuja su recorrido del día', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${environment.apiUrl}/posicion`).flush([
      { vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: new Date().toISOString(), latitud: -33.40, longitud: -70.60 }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/vendedores`).flush([{ codigo: '001', tipo: '0', nombre: 'Juan Perez' }]);

    const marker = (component as any).markers.get('001');
    expect(marker).toBeTruthy();

    marker.fire('click');

    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 }
    ]);

    expect(component.seleccionados().has('001_0')).toBeTrue();
  });
```

- [ ] **Step 2: Ejecutar y verificar que falla**

Run: `npx ng test --watch=false`
Expected: FAIL — el clic en el marker sigue llamando a `consultarYDibujarTrayectoriaDia`, que dibuja sobre `historialLayer` directamente pero nunca agrega la clave a `seleccionados`.

- [ ] **Step 3: Cambiar el listener de clic del marker**

Ubicar, dentro de `updatePositionOnMap`, el bloque:

```typescript
      marker.on('click', () => {
        this.consultarYDibujarTrayectoriaDia(vendedorId, vendedorCodigo);
      });
```

y reemplazarlo por:

```typescript
      marker.on('click', () => {
        this.toggleTrayectoria({ codigo: vendedorId, tipo: vendedorCodigo, nombre: data.vendedorNombre });
      });
```

- [ ] **Step 4: Eliminar el código muerto**

Borrar por completo los métodos `showHistory(points: HistorialPosicionDTO[])`, `private groupBySeller(...)` y `private consultarYDibujarTrayectoriaDia(...)` de `mapa.component.ts` (los tres quedaron sin uso: el primero nunca se llamó, y el clic del marker ya no usa el tercero).

- [ ] **Step 5: Ejecutar y verificar que pasa**

Run: `npx ng test --watch=false`
Expected: PASS para el test nuevo y toda la suite preexistente. Confirmar además que `npx tsc --noEmit` (o `ng build`) no reporta código muerto/errores de referencias rotas a los métodos eliminados.

- [ ] **Step 6: Commit**

```bash
git add src/app/mapa/mapa.component.ts src/app/mapa/mapa.component.spec.ts
git commit -m "refactor: el clic en el marker usa toggleTrayectoria y elimina código muerto"
```

---

### Task 8: Integración final — checkbox de la lista controla el mapa y viceversa

**Files:**
- Modify: `src/app/mapa/mapa.component.html`
- Test: `src/app/mapa/mapa.component.spec.ts`

**Interfaces:**
- Consumes: `[selectedIds]` / `(trayectoriaToggled)` de `VendorListComponent` (Task 1), `seleccionados` / `toggleTrayectoria` de `MapaComponent` (Tasks 3-7).
- Produces: ninguna interfaz nueva — es el cableado final entre ambos componentes.

- [ ] **Step 1: Escribir los tests que fallan**

```typescript
  it('marcar el checkbox de un vendedor en la lista dibuja su recorrido', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${environment.apiUrl}/posicion`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/vendedores`).flush([{ codigo: '001', tipo: '0', nombre: 'Juan Perez' }]);
    fixture.detectChanges();

    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.vendor-list__checkbox');
    expect(checkbox).toBeTruthy();

    checkbox.dispatchEvent(new Event('change'));

    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 }
    ]);

    expect(component.seleccionados().has('001_0')).toBeTrue();
  });

  it('al hacer clic en el marker, el checkbox correspondiente en la lista se marca', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${environment.apiUrl}/posicion`).flush([
      { vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: new Date().toISOString(), latitud: -33.40, longitud: -70.60 }
    ]);
    httpMock.expectOne(`${environment.apiUrl}/vendedores`).flush([{ codigo: '001', tipo: '0', nombre: 'Juan Perez' }]);

    const marker = (component as any).markers.get('001');
    marker.fire('click');
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 }
    ]);

    fixture.detectChanges();

    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('.vendor-list__checkbox');
    expect(checkbox.checked).toBeTrue();
  });
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `npx ng test --watch=false`
Expected: FAIL — `<app-vendor-list>` todavía no recibe `selectedIds` ni emite hacia `toggleTrayectoria`, así que marcar el checkbox no dispara ningún POST, y el clic en el marker no marca el checkbox.

- [ ] **Step 3: Conectar los bindings en `mapa.component.html`**

Reemplazar el bloque `<app-vendor-list>` por:

```html
  <app-vendor-list
    [vendedores]="vendedores()"
    [selectedIds]="seleccionados()"
    (vendedorSeleccionado)="centrarEnVendedor($event)"
    (trayectoriaToggled)="toggleTrayectoria({ codigo: $event.vendedorId, tipo: $event.vendedorCodigo, nombre: $event.vendedorNombre })">
  </app-vendor-list>
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `npx ng test --watch=false`
Expected: PASS para los 2 tests nuevos y **toda** la suite del módulo `mapa` (Tasks 1-8 completas).

- [ ] **Step 5: Commit**

```bash
git add src/app/mapa/mapa.component.html src/app/mapa/mapa.component.spec.ts
git commit -m "feat: conecta el checkbox de la lista de vendedores con el recorrido en el mapa"
```

---

## Verificación manual final (no automatizada)

Después de la Task 8, con el backend corriendo, levantar el cliente (`npm start` o equivalente) y verificar en el navegador:
1. Marcar el checkbox de dos vendedores distintos en la lista → ambos recorridos aparecen en el mapa con colores distintos, la vista se ajusta para mostrar ambos.
2. Hacer clic en el marker de uno de ellos → su checkbox en la lista se desmarca y su recorrido desaparece del mapa.
3. Doble clic sobre una fila de la lista → el mapa se centra en la posición actual de ese vendedor, sin alterar las trayectorias visibles.
4. Marcar el checkbox de un vendedor sin actividad hoy → aparece el toast "Sin recorrido registrado hoy para {nombre}" y desaparece solo a los ~3 segundos.

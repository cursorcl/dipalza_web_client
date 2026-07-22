# Lista de vendedores junto al mapa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar, al lado derecho del mapa de vendedores, una lista con el nombre, color, tiempo relativo y estado online/offline de cada vendedor visible, con doble clic para centrar el mapa en su última posición, usando un color determinístico (no dependiente del orden de conexión) por vendedor.

**Architecture:** Se agrega una función pura `colorForVendedor` (hash sobre `vendedorId_vendedorCodigo` → índice de paleta) que reemplaza la asignación por orden de llegada existente. Un componente presentacional nuevo `VendorListComponent` recibe la lista ya calculada por `@Input()` y emite el `vendedorId` seleccionado por `@Output()`. `MapaComponent` mantiene una señal `vendedores` recalculada en cada actualización de posición y en el tick de 1s que ya existe para refrescar tooltips, y añade `centrarEnVendedor()` para recentrar el mapa.

**Tech Stack:** Angular 20 (standalone components, signals, control flow `@for`), Karma/Jasmine (`ng test`), Leaflet.

## Global Constraints

- Offline = 2 minutos o más sin reportar posición (`fechaHora`).
- El color de un vendedor debe ser el mismo sin importar el orden en que se conecta ni entre sesiones (función pura, sin caché de asignación por orden de llegada).
- El doble clic en la lista solo centra el mapa (`map.setView`, mismo zoom); no dispara la consulta de trayectoria del día (eso lo sigue haciendo el clic simple sobre el marcador, sin cambios).
- No se modifica el backend en este plan.
- Panel lateral de ancho fijo (~280px) a la derecha del mapa, mismo alto que el mapa (`calc(100vh - 100px)`).

---

### Task 1: Color determinístico por vendedor + modelo de la lista

**Files:**
- Create: `src/app/mapa/vendor-color.ts`
- Create: `src/app/mapa/vendor-color.spec.ts`
- Modify: `src/app/mapa/models/model.ts`

**Interfaces:**
- Produces: `colorForVendedor(key: string): string` — función pura, misma key siempre devuelve el mismo color, formato `hsl(H, 70%, 50%)`.
- Produces: `VendedorListItem` interface — `{ vendedorId: string; vendedorCodigo: string; vendedorNombre: string; color: string; fechaHora: string; tiempoRelativo: string; online: boolean; }`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/mapa/vendor-color.spec.ts`:

```ts
import { colorForVendedor } from './vendor-color';

describe('colorForVendedor', () => {
  it('devuelve siempre el mismo color para la misma key', () => {
    const color1 = colorForVendedor('001_0');
    const color2 = colorForVendedor('001_0');
    expect(color1).toBe(color2);
  });

  it('devuelve un color con el formato de la paleta generada', () => {
    const color = colorForVendedor('002_0');
    expect(color).toMatch(/^hsl\(\d+(\.\d+)?, 70%, 50%\)$/);
  });

  it('no depende del orden de las llamadas (sin estado compartido mutable)', () => {
    const colorA = colorForVendedor('AAA_0');
    colorForVendedor('BBB_0');
    colorForVendedor('CCC_0');
    const colorAOtraVez = colorForVendedor('AAA_0');
    expect(colorAOtraVez).toBe(colorA);
  });

  it('distintas keys pueden caer en distinto color', () => {
    const color1 = colorForVendedor('001_0');
    const color2 = colorForVendedor('999_1');
    // No garantizamos que siempre difieran (hay solo 20 colores),
    // pero para estas dos keys concretas sí deben diferir.
    expect(color1).not.toBe(color2);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `ng test --include='**/vendor-color.spec.ts'`
Expected: FAIL — no existe el módulo `./vendor-color`.

- [ ] **Step 3: Implementar `colorForVendedor`**

Crear `src/app/mapa/vendor-color.ts`:

```ts
import { generateColorPellete } from 'app/utils/color-pallet';

const PALETTE_SIZE = 20;
const palette = generateColorPellete(PALETTE_SIZE);

/**
 * Hash djb2: determinístico y sin dependencias externas.
 */
function djb2Hash(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Color determinístico para un vendedor a partir de su key
 * (`vendedorId_vendedorCodigo`). Misma key -> mismo color siempre,
 * sin importar el orden de llegada ni la sesión.
 */
export function colorForVendedor(key: string): string {
  const index = djb2Hash(key) % palette.length;
  return palette[index];
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `ng test --include='**/vendor-color.spec.ts'`
Expected: PASS (4 specs).

- [ ] **Step 5: Agregar `VendedorListItem` al modelo**

Modificar `src/app/mapa/models/model.ts`, agregando al final del archivo:

```ts
export interface VendedorListItem {
  vendedorId: string;
  vendedorCodigo: string;
  vendedorNombre: string;
  color: string;
  fechaHora: string;
  tiempoRelativo: string;
  online: boolean;
}
```

- [ ] **Step 6: Compilar para verificar que no hay errores de tipos**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sin errores relacionados a `vendor-color.ts` ni `models/model.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/app/mapa/vendor-color.ts src/app/mapa/vendor-color.spec.ts src/app/mapa/models/model.ts
git commit -m "feat: add deterministic per-vendor color and vendor list item model"
```

---

### Task 2: Reemplazar la asignación de color por orden de llegada en `MapaComponent`

**Files:**
- Modify: `src/app/mapa/mapa.component.ts:1-24, 71-113, 177-198, 218-251`

**Interfaces:**
- Consumes: `colorForVendedor(key: string): string` de `./vendor-color` (Task 1).

- [ ] **Step 1: Cambiar los imports**

En `src/app/mapa/mapa.component.ts`, reemplazar la línea 9:

```ts
import { generateColorPellete } from 'app/utils/color-pallet';
```

por:

```ts
import { colorForVendedor } from './vendor-color';
```

- [ ] **Step 2: Quitar el estado de asignación por orden de llegada**

Reemplazar (líneas 22-24):

```ts
  private colors: Map<string, string> = new Map(); // Mapa para asignar colores únicos a cada vendedor
  private colorPellete: string[] = generateColorPellete(20); // Generamos una paleta de colores para hasta 20 vendedores
  private colorIndex: number = 0; // Índice para asignar colores de la paleta
```

por (se elimina completo, sin reemplazo — ya no hace falta estado):

```ts
```

- [ ] **Step 3: Quitar el método `getColorForVendedor` y usar la función pura en su lugar**

Reemplazar el método completo (líneas 107-113):

```ts
  getColorForVendedor(key: string): string {

    const markerColor = this.colors.get(key) || this.colorPellete[this.colorIndex];
    this.colors.set(key, markerColor);
    this.colorIndex = (this.colorIndex + 1) % this.colorPellete.length; // Avanzamos al siguiente color de la paleta
    return markerColor;
  }
```

por (se elimina completo, sin reemplazo).

- [ ] **Step 4: Actualizar los tres call sites**

En `updatePositionOnMap` (línea 81), reemplazar:

```ts
      const markerColor = this.getColorForVendedor(key);
```

por:

```ts
      const markerColor = colorForVendedor(key);
```

En `showHistory` (línea 185), reemplazar:

```ts
      const color = this.getColorForVendedor(key);
```

por:

```ts
      const color = colorForVendedor(key);
```

En `consultarYDibujarTrayectoriaDia` (línea 234), reemplazar:

```ts
          const color = this.getColorForVendedor(key);
```

por:

```ts
          const color = colorForVendedor(key);
```

- [ ] **Step 5: Compilar y correr el test existente del componente**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sin errores en `mapa.component.ts` (en particular, ninguna referencia colgante a `getColorForVendedor`, `colors`, `colorPellete` o `colorIndex`).

Run: `ng test --include='**/mapa.component.spec.ts'`
Expected: PASS (test "should create" sigue pasando).

- [ ] **Step 6: Commit**

```bash
git add src/app/mapa/mapa.component.ts
git commit -m "refactor: use deterministic colorForVendedor instead of order-of-arrival color assignment"
```

---

### Task 3: Componente presentacional `VendorListComponent`

**Files:**
- Create: `src/app/mapa/vendor-list/vendor-list.component.ts`
- Create: `src/app/mapa/vendor-list/vendor-list.component.html`
- Create: `src/app/mapa/vendor-list/vendor-list.component.scss`
- Create: `src/app/mapa/vendor-list/vendor-list.component.spec.ts`

**Interfaces:**
- Consumes: `VendedorListItem` de `../models/model` (Task 1).
- Produces: `VendorListComponent` con `@Input() vendedores: VendedorListItem[]` y `@Output() vendedorSeleccionado: EventEmitter<string>` — usado por `MapaComponent` en la Task 4.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/mapa/vendor-list/vendor-list.component.spec.ts`:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VendorListComponent } from './vendor-list.component';
import { VendedorListItem } from '../models/model';

describe('VendorListComponent', () => {
  let component: VendorListComponent;
  let fixture: ComponentFixture<VendorListComponent>;

  const vendedorEjemplo: VendedorListItem = {
    vendedorId: '001',
    vendedorCodigo: '0',
    vendedorNombre: 'Juan Perez',
    color: 'hsl(0, 70%, 50%)',
    fechaHora: new Date().toISOString(),
    tiempoRelativo: '5 segundos',
    online: true
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VendorListComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(VendorListComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renderiza una fila por cada vendedor recibido', () => {
    component.vendedores = [vendedorEjemplo];
    fixture.detectChanges();

    const filas = fixture.nativeElement.querySelectorAll('.vendor-list__item');
    expect(filas.length).toBe(1);
    expect(filas[0].textContent).toContain('Juan Perez');
    expect(filas[0].textContent).toContain('5 segundos');
  });

  it('emite vendedorSeleccionado con el vendedorId al hacer doble clic', () => {
    component.vendedores = [vendedorEjemplo];
    fixture.detectChanges();

    const emitidos: string[] = [];
    component.vendedorSeleccionado.subscribe((id) => emitidos.push(id));

    const fila = fixture.nativeElement.querySelector('.vendor-list__item');
    fila.dispatchEvent(new Event('dblclick'));

    expect(emitidos).toEqual(['001']);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `ng test --include='**/vendor-list.component.spec.ts'`
Expected: FAIL — no existe el módulo `./vendor-list.component`.

- [ ] **Step 3: Implementar el componente**

Crear `src/app/mapa/vendor-list/vendor-list.component.ts`:

```ts
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
  @Output() vendedorSeleccionado = new EventEmitter<string>();

  onDoubleClick(vendedorId: string): void {
    this.vendedorSeleccionado.emit(vendedorId);
  }
}
```

Crear `src/app/mapa/vendor-list/vendor-list.component.html`:

```html
<div class="vendor-list">
  @for (vendedor of vendedores; track vendedor.vendedorId) {
    <div class="vendor-list__item" (dblclick)="onDoubleClick(vendedor.vendedorId)">
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

Crear `src/app/mapa/vendor-list/vendor-list.component.scss`:

```scss
:host {
    display: block;
    width: 280px;
    height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
    border-left: 1px solid #e9ecef;
}

.vendor-list__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    cursor: pointer;
}

.vendor-list__item:hover {
    background-color: #f6f6f6;
}

.vendor-list__dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
}

.vendor-list__info {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
}

.vendor-list__nombre {
    font-size: 13px;
    font-weight: 600;
    color: #2c3e50;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.vendor-list__tiempo {
    font-size: 11px;
    color: #6c757d;
}

.vendor-list__estado {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: #adb5bd;
    flex-shrink: 0;
}

.vendor-list__estado--online {
    background-color: #2ecc71;
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `ng test --include='**/vendor-list.component.spec.ts'`
Expected: PASS (3 specs).

- [ ] **Step 5: Commit**

```bash
git add src/app/mapa/vendor-list/
git commit -m "feat: add VendorListComponent presentational component"
```

---

### Task 4: Integrar la lista en `MapaComponent` (layout, estado reactivo, centrado)

**Files:**
- Modify: `src/app/mapa/mapa.component.ts`
- Modify: `src/app/mapa/mapa.component.html`
- Modify: `src/app/mapa/mapa.component.scss`
- Modify: `src/app/mapa/mapa.component.spec.ts`

**Interfaces:**
- Consumes: `VendorListComponent` (Task 3), `colorForVendedor` (Task 1), `VendedorListItem` (Task 1).
- Produces: `MapaComponent.centrarEnVendedor(vendedorId: string): void` — público, invocado desde el template al recibir `(vendedorSeleccionado)`.

- [ ] **Step 1: Escribir el test que falla**

Agregar a `src/app/mapa/mapa.component.spec.ts` (después del test `'should create'` existente):

```ts
  it('centrarEnVendedor no lanza error si el vendedorId no tiene marcador', () => {
    expect(() => component.centrarEnVendedor('no-existe')).not.toThrow();
  });
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `ng test --include='**/mapa.component.spec.ts'`
Expected: FAIL — `Property 'centrarEnVendedor' does not exist on type 'MapaComponent'`.

- [ ] **Step 3: Actualizar los imports y el decorador del componente**

En `src/app/mapa/mapa.component.ts`, reemplazar la línea 1:

```ts
import { AfterViewInit, Component, DestroyRef, ElementRef, inject, OnDestroy, ViewChild } from '@angular/core';
```

por:

```ts
import { AfterViewInit, Component, DestroyRef, ElementRef, inject, OnDestroy, signal, ViewChild } from '@angular/core';
```

Reemplazar la línea 4:

```ts
import { HistorialPosicionDTO, PosicionDTO } from './models/model';
```

por:

```ts
import { HistorialPosicionDTO, PosicionDTO, VendedorListItem } from './models/model';
```

Agregar, junto a los demás imports (después de la línea de `colorForVendedor` de la Task 2):

```ts
import { VendorListComponent } from './vendor-list/vendor-list.component';
```

Reemplazar el decorador:

```ts
@Component({
  selector: 'app-mapa',
  imports: [],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.scss'
})
```

por:

```ts
@Component({
  selector: 'app-mapa',
  imports: [VendorListComponent],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.scss'
})
```

- [ ] **Step 4: Agregar el estado reactivo de la lista**

Agregar, junto a los demás campos privados del componente (después de `private tooltipRefreshInterval?: ReturnType<typeof setInterval>;`):

```ts
  vendedores = signal<VendedorListItem[]>([]);
```

- [ ] **Step 5: Agregar el método que recalcula la lista**

Agregar como método privado nuevo, después de `updateTooltips`:

```ts
  private actualizarListaVendedores(): void {
    const ahora = Date.now();
    const items: VendedorListItem[] = Array.from(this.posicionesActuales.values()).map((data) => {
      const key = `${data.vendedorId}_${data.vendedorCodigo}`;
      const ultimaActualizacion = new Date(data.fechaHora).getTime();
      return {
        vendedorId: data.vendedorId,
        vendedorCodigo: data.vendedorCodigo,
        vendedorNombre: data.vendedorNombre,
        color: colorForVendedor(key),
        fechaHora: data.fechaHora,
        tiempoRelativo: TimeFormatter.formatRelativeTime(data.fechaHora),
        online: (ahora - ultimaActualizacion) < 2 * 60 * 1000
      };
    });
    this.vendedores.set(items);
  }
```

- [ ] **Step 6: Llamar a `actualizarListaVendedores` cuando llegan datos nuevos y en cada refresco de 1s**

En `updatePositionOnMap`, al final del método (después del bloque `if (marker) { this.updateTooltips(marker, data); }`), agregar:

```ts
    this.actualizarListaVendedores();
```

De forma que el final del método quede:

```ts
    if (marker) {
      this.updateTooltips(marker, data);
    }
    this.actualizarListaVendedores();

  }
```

En `ngAfterViewInit`, dentro del `setInterval` existente, agregar la llamada al final del callback:

```ts
    this.tooltipRefreshInterval = setInterval(() => {
      this.markers.forEach((marker, key) => {
        const data = this.posicionesActuales.get(key);
        if (data) {
          this.updateTooltips(marker, data);
        }
      });
      this.actualizarListaVendedores();
    }, 1000);
```

- [ ] **Step 7: Agregar `centrarEnVendedor`**

Agregar como método público, después de `actualizarListaVendedores`:

```ts
  centrarEnVendedor(vendedorId: string): void {
    const marker = this.markers.get(vendedorId);
    if (marker) {
      this.map.setView(marker.getLatLng(), this.map.getZoom());
    }
  }
```

- [ ] **Step 8: Correr el test y verificar que pasa**

Run: `ng test --include='**/mapa.component.spec.ts'`
Expected: PASS (2 specs).

- [ ] **Step 9: Actualizar la plantilla**

Reemplazar el contenido completo de `src/app/mapa/mapa.component.html`:

```html
<section class="main-content">
<div class="mapa-layout">
  <div class="map-container" #map></div>
  <app-vendor-list
    [vendedores]="vendedores()"
    (vendedorSeleccionado)="centrarEnVendedor($event)">
  </app-vendor-list>
</div>
</section>
```

- [ ] **Step 10: Actualizar los estilos**

En `src/app/mapa/mapa.component.scss`, reemplazar el bloque inicial:

```scss
.map-container {
    height: calc(100vh - 100px);
    /* ajuste a su header */
    width: 100%;
    position: relative;
}
```

por:

```scss
.mapa-layout {
    display: flex;
    height: calc(100vh - 100px);
    width: 100%;
}

.map-container {
    flex: 1 1 auto;
    height: 100%;
    position: relative;
}
```

- [ ] **Step 11: Compilar y correr toda la suite de `mapa`**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sin errores.

Run: `ng test --include='**/mapa/**/*.spec.ts'`
Expected: PASS — todos los specs de `vendor-color`, `vendor-list` y `mapa.component`.

- [ ] **Step 12: Probar visualmente**

Levantar el frontend (`ng serve`) y el backend, entrar al mapa con al menos un vendedor reportando posición, y verificar:
- La lista aparece a la derecha del mapa con punto de color, nombre, tiempo relativo y estado online/offline.
- El color del punto coincide con el color del marcador en el mapa.
- Doble clic en una fila centra el mapa en la posición de ese vendedor sin cambiar el zoom.
- Después de ~2 minutos sin nuevas posiciones para un vendedor, su estado pasa a offline en la lista.

- [ ] **Step 13: Commit**

```bash
git add src/app/mapa/mapa.component.ts src/app/mapa/mapa.component.html src/app/mapa/mapa.component.scss src/app/mapa/mapa.component.spec.ts
git commit -m "feat: show vendor list sidebar next to the map with double-click centering"
```

# Panel de vendedores flotante y selección única — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la selección múltiple de vendedores en el mapa por selección única (un recorrido visible a la vez, sin checkbox), y convertir el panel de la lista de vendedores de una columna lateral fija en un panel flotante semi-transparente, colapsable y de alto mínimo sobre el mapa.

**Architecture:** `MapaComponent.seleccionados: Signal<Set<string>>` se reemplaza por `seleccionado: Signal<string | null>`; `toggleTrayectoria` pasa de agregar/quitar de un Set a reemplazar la selección activa. `VendorListComponent` cambia su contrato de `selectedIds: Set<string>` a `selectedId: string | null`, quita el checkbox (la fila entera es el área de clic) y gana un encabezado colapsable con estado local (`colapsado: Signal<boolean>`). El panel pasa de ser hermano de `.map-wrapper` (columna que empuja el mapa) a estar dentro de `.map-wrapper` (flota con `position: absolute` sobre el mapa, ancla en la esquina superior derecha).

**Tech Stack:** Angular 20 (standalone components, signals, `@if`/`@for`), Leaflet, Jasmine + Karma, `HttpTestingController`.

## Global Constraints

- Selección única: nunca hay más de un recorrido visible a la vez. Clic en el mismo vendedor ya seleccionado lo deselecciona; clic en otro reemplaza la selección (oculta el anterior, muestra el nuevo).
- El doble clic en un marcador del mapa sigue centrando la vista en él (`centrarEnVendedor`) y no debe verse afectado por estos cambios.
- Sin checkbox en la lista de vendedores. La fila completa es el área de clic, sin selección de texto accidental (`user-select: none`), y la fila del vendedor activo se resalta visualmente con la clase `vendor-list__item--selected`.
- El panel de vendedores flota sobre la esquina superior derecha del mapa (`position: absolute; top: 16px; right: 16px`), con fondo semi-transparente (`rgba(255, 255, 255, 0.85)`).
- El panel tiene un encabezado fijo con un botón/flecha que colapsa y expande el cuerpo con la lista; colapsado, solo el encabezado queda visible.
- El panel usa el alto mínimo necesario para su contenido, acotado por `max-height: calc(100% - 32px)` del contenedor del mapa; si la lista excede ese alto, el cuerpo de la lista (no el panel completo) muestra scroll interno (`overflow-y: auto`).
- Fuera de alcance (no implementar): animación de colapso más allá de una transición CSS trivial si aplica, persistencia del estado colapsado entre sesiones, panel arrastrable/reposicionable, buscador de texto dentro del panel.
- Ejecutar `npx ng test --watch=false` (suite completa) antes de dar por cerrada cada tarea — hay fallas preexistentes no relacionadas en el proyecto; comparar el conteo de fallas antes/después de cada tarea para confirmar que no aumentó.

---

### Task 1: Selección única — `MapaComponent` y contrato de `VendorListComponent`

**Files:**
- Modify: `src/app/mapa/mapa.component.ts:38-40` (campos), `:205-247` (`toggleTrayectoria`), `:293-298` (cola de `mostrarTrayectoria`)
- Modify: `src/app/mapa/mapa.component.html:9-14` (binding `app-vendor-list`)
- Modify: `src/app/mapa/vendor-list/vendor-list.component.ts` (Input, Output, métodos)
- Modify: `src/app/mapa/vendor-list/vendor-list.component.html` (quitar checkbox, agregar clic en fila)
- Modify: `src/app/mapa/vendor-list/vendor-list.component.scss` (quitar regla del checkbox, agregar `--selected`)
- Test: `src/app/mapa/mapa.component.spec.ts`
- Test: `src/app/mapa/vendor-list/vendor-list.component.spec.ts`

**Interfaces:**
- Consumes: `VendedorListItem`, `VendedorId`, `PositionFilter` (sin cambios, `src/app/mapa/models/model.ts`).
- Produces: `MapaComponent.seleccionado: Signal<string | null>` (reemplaza `seleccionados: Signal<Set<string>>`). `VendorListComponent.selectedId: string | null` (reemplaza `selectedIds: Set<string>`). `VendorListComponent.onSeleccionar(vendedor: VendedorListItem): void` (reemplaza `onToggleTrayectoria`, ya no recibe `Event`).

- [ ] **Step 1: Actualizar `VendorListComponent` — quitar checkbox, agregar clic en fila**

Reemplazar el contenido completo de `src/app/mapa/vendor-list/vendor-list.component.ts`:

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
  @Input() selectedId: string | null = null;
  @Output() vendedorSeleccionado = new EventEmitter<string>();
  @Output() trayectoriaToggled = new EventEmitter<VendedorListItem>();

  onDoubleClick(vendedorId: string): void {
    this.vendedorSeleccionado.emit(vendedorId);
  }

  onSeleccionar(vendedor: VendedorListItem): void {
    this.trayectoriaToggled.emit(vendedor);
  }

  isSelected(vendedor: VendedorListItem): boolean {
    return this.selectedId === `${vendedor.vendedorId}_${vendedor.vendedorCodigo}`;
  }
}
```

Reemplazar el contenido completo de `src/app/mapa/vendor-list/vendor-list.component.html`:

```html
<div class="vendor-list">
  @for (vendedor of vendedores; track vendedor.vendedorId) {
    <div
      class="vendor-list__item"
      [class.vendor-list__item--selected]="isSelected(vendedor)"
      (click)="onSeleccionar(vendedor)"
      (dblclick)="onDoubleClick(vendedor.vendedorId)">
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

En `src/app/mapa/vendor-list/vendor-list.component.scss`, quitar la regla `.vendor-list__checkbox` (ya no existe ese elemento) y agregar junto a `.vendor-list__item:hover`:

```scss
.vendor-list__item--selected {
    background-color: #eef1f4;
}
```

- [ ] **Step 2: Actualizar `vendor-list.component.spec.ts`**

Reemplazar el contenido completo de `src/app/mapa/vendor-list/vendor-list.component.spec.ts`:

```typescript
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

  it('aplica la clase de fila seleccionada cuando selectedId coincide con la clave del vendedor', () => {
    component.vendedores = [vendedorEjemplo];
    component.selectedId = '001_0';
    fixture.detectChanges();

    const fila: HTMLElement = fixture.nativeElement.querySelector('.vendor-list__item');
    expect(fila.classList.contains('vendor-list__item--selected')).toBeTrue();
  });

  it('no aplica la clase de fila seleccionada cuando selectedId es distinto', () => {
    component.vendedores = [vendedorEjemplo];
    component.selectedId = null;
    fixture.detectChanges();

    const fila: HTMLElement = fixture.nativeElement.querySelector('.vendor-list__item');
    expect(fila.classList.contains('vendor-list__item--selected')).toBeFalse();
  });

  it('emite trayectoriaToggled con el vendedor completo al hacer clic en la fila', () => {
    component.vendedores = [vendedorEjemplo];
    fixture.detectChanges();

    const emitidos: VendedorListItem[] = [];
    component.trayectoriaToggled.subscribe((v) => emitidos.push(v));

    const fila: HTMLElement = fixture.nativeElement.querySelector('.vendor-list__item');
    fila.dispatchEvent(new Event('click'));

    expect(emitidos).toEqual([vendedorEjemplo]);
  });
});
```

Run: `npx ng test --watch=false --include=src/app/mapa/vendor-list/vendor-list.component.spec.ts`
Expected: 6/6 tests pasan (los 3 tests de checkbox del archivo anterior ya no existen, fueron reemplazados por los 3 nuevos de arriba).

- [ ] **Step 3: Actualizar el modelo de selección en `MapaComponent`**

En `src/app/mapa/mapa.component.ts`, reemplazar la línea 40:

```typescript
seleccionados = signal<Set<string>>(new Set());
```

por:

```typescript
seleccionado = signal<string | null>(null);
```

Reemplazar el método `toggleTrayectoria` completo (líneas 205-247 actuales):

```typescript
toggleTrayectoria(vendedor: VendedorId & { nombre: string }): void {
    const key = `${vendedor.codigo}_${vendedor.tipo}`;

    if (key === this.seleccionado()) {
      this.ocultarTrayectoria(key);
      this.seleccionado.set(null);
      return;
    }

    if (this.cargando.has(key)) {
      return;
    }

    const anterior = this.seleccionado();
    if (anterior !== null) {
      this.ocultarTrayectoria(anterior);
      this.seleccionado.set(null);
    }

    const hoy = new Date().toLocaleDateString('en-CA'); // Formato YYYY-MM-DD en huso horario local
    const filter: PositionFilter = {
      vendedorIds: [{ codigo: vendedor.codigo, tipo: vendedor.tipo }],
      dia: hoy
    };

    this.cargando.add(key);

    this.positionService.getHistoric(filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: puntos => {
          this.cargando.delete(key);
          if (puntos.length === 0) {
            this.mostrarToast(`Sin recorrido registrado hoy para ${vendedor.nombre}`);
            return;
          }
          this.mostrarTrayectoria(key, puntos);
        },
        error: () => {
          this.cargando.delete(key);
          this.mostrarToast(`No se pudo obtener el recorrido de ${vendedor.nombre}`);
        }
      });
}

private ocultarTrayectoria(key: string): void {
    const layer = this.trayectoriasPorVendedor.get(key);
    if (!layer) return;
    this.historialLayer.removeLayer(layer);
    this.trayectoriasPorVendedor.delete(key);
}
```

En `mostrarTrayectoria`, reemplazar las líneas actuales:

```typescript
    const actualizado = new Set(this.seleccionados());
    actualizado.add(key);
    this.seleccionados.set(actualizado);
```

por:

```typescript
    this.seleccionado.set(key);
```

- [ ] **Step 4: Actualizar el binding en `mapa.component.html`**

En `src/app/mapa/mapa.component.html`, reemplazar:

```html
  <app-vendor-list
    [vendedores]="vendedores()"
    [selectedIds]="seleccionados()"
    (vendedorSeleccionado)="centrarEnVendedor($event)"
    (trayectoriaToggled)="toggleTrayectoria({ codigo: $event.vendedorId, tipo: $event.vendedorCodigo, nombre: $event.vendedorNombre })">
  </app-vendor-list>
```

por:

```html
  <app-vendor-list
    [vendedores]="vendedores()"
    [selectedId]="seleccionado()"
    (vendedorSeleccionado)="centrarEnVendedor($event)"
    (trayectoriaToggled)="toggleTrayectoria({ codigo: $event.vendedorId, tipo: $event.vendedorCodigo, nombre: $event.vendedorNombre })">
  </app-vendor-list>
```

- [ ] **Step 5: Actualizar `mapa.component.spec.ts`**

Aplicar los siguientes reemplazos sobre `src/app/mapa/mapa.component.spec.ts`:

5a. Test `'toggleTrayectoria dibuja el recorrido del día y lo agrega a seleccionados'` — renombrar a `'toggleTrayectoria dibuja el recorrido del día y lo marca como seleccionado'` y reemplazar su última línea:

```typescript
    expect(component.seleccionados().has('001_0')).toBeTrue();
```

por:

```typescript
    expect(component.seleccionado()).toBe('001_0');
```

5b. Test `'toggleTrayectoria oculta el recorrido si ya estaba visible'` — reemplazar sus dos aserciones:

```typescript
    expect(component.seleccionados().has('001_0')).toBeTrue();

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });

    expect(component.seleccionados().has('001_0')).toBeFalse();
```

por:

```typescript
    expect(component.seleccionado()).toBe('001_0');

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });

    expect(component.seleccionado()).toBeNull();
```

5c. Test `'toggleTrayectoria muestra un toast si no hay recorrido para hoy'` — reemplazar:

```typescript
    expect(component.seleccionados().has('002_0')).toBeFalse();
```

por:

```typescript
    expect(component.seleccionado()).toBeNull();
```

5d. Reemplazar el test completo `'al seleccionar dos vendedores, la vista se ajusta para mostrar ambos recorridos'` por:

```typescript
  it('al seleccionar otro vendedor, se reemplaza el recorrido anterior y la vista se ajusta al nuevo', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 }
    ]);
    expect(component.seleccionado()).toBe('001_0');
    expect((component as any).historialLayer.getLayers().length).toBe(1);

    component.toggleTrayectoria({ codigo: '002', tipo: '0', nombre: 'Ana Soto' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 2, vendedorId: '002', vendedorCodigo: '0', vendedorNombre: 'Ana Soto', fechaHora: '2026-07-26T09:00:00', latitud: -34.00, longitud: -71.00 }
    ]);

    expect(component.seleccionado()).toBe('002_0');
    expect((component as any).historialLayer.getLayers().length).toBe(1);

    const mapBounds = (component as any).map.getBounds();
    expect(mapBounds.contains(L.latLng(-34.00, -71.00))).toBeTrue();
  });
```

5e. Test `'el clic en el marker de un vendedor dibuja su recorrido del día'` — reemplazar su última línea:

```typescript
    expect(component.seleccionados().has('001_0')).toBeTrue();
```

por:

```typescript
    expect(component.seleccionado()).toBe('001_0');
```

5f. Reemplazar el test completo `'marcar el checkbox de un vendedor en la lista dibuja su recorrido'` por:

```typescript
  it('hacer clic en la fila de un vendedor en la lista dibuja su recorrido', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${environment.apiUrl}/posicion`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/vendedores`).flush([{ codigo: '001', tipo: '0', nombre: 'Juan Perez' }]);
    fixture.detectChanges();

    const fila: HTMLElement = fixture.nativeElement.querySelector('.vendor-list__item');
    expect(fila).toBeTruthy();

    fila.dispatchEvent(new Event('click'));

    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 }
    ]);

    expect(component.seleccionado()).toBe('001_0');
  });
```

5g. Reemplazar el test completo `'el checkbox queda sin marcar tras un historial vacío (no debe quedar visualmente marcado)'` por:

```typescript
  it('la fila no queda resaltada tras un historial vacío', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    httpMock.expectOne(`${environment.apiUrl}/posicion`).flush([]);
    httpMock.expectOne(`${environment.apiUrl}/vendedores`).flush([{ codigo: '002', tipo: '0', nombre: 'Ana Soto' }]);
    fixture.detectChanges();

    const fila: HTMLElement = fixture.nativeElement.querySelector('.vendor-list__item');
    fila.dispatchEvent(new Event('click'));

    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([]);
    fixture.detectChanges();

    expect(component.seleccionado()).toBeNull();
    expect(fila.classList.contains('vendor-list__item--selected')).toBeFalse();
  });
```

5h. Test `'un doble toggle rápido del mismo vendedor antes de que llegue la respuesta HTTP no dispara una segunda solicitud'` — reemplazar sus tres aserciones:

```typescript
    expect(component.seleccionados().has('001_0')).toBeTrue();
    expect((component as any).historialLayer.getLayers().length).toBe(1);

    // Una vez resuelta la solicitud, el toggle nuevamente debe poder ocultar el recorrido.
    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    expect(component.seleccionados().has('001_0')).toBeFalse();
```

por:

```typescript
    expect(component.seleccionado()).toBe('001_0');
    expect((component as any).historialLayer.getLayers().length).toBe(1);

    // Una vez resuelta la solicitud, el toggle nuevamente debe poder ocultar el recorrido.
    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    expect(component.seleccionado()).toBeNull();
```

5i. Test `'muestra un toast y no agrega al vendedor a seleccionados si getHistoric falla'` — reemplazar su última línea:

```typescript
    expect(component.seleccionados().has('001_0')).toBeFalse();
```

por:

```typescript
    expect(component.seleccionado()).toBeNull();
```

5j. Reemplazar el test completo `'al hacer clic en el marker, el checkbox correspondiente en la lista se marca'` por:

```typescript
  it('al hacer clic en el marker, la fila correspondiente en la lista queda resaltada', () => {
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

    const fila: HTMLElement = fixture.nativeElement.querySelector('.vendor-list__item');
    expect(fila.classList.contains('vendor-list__item--selected')).toBeTrue();
  });
```

Run: `npx ng test --watch=false --include=src/app/mapa/mapa.component.spec.ts`
Expected: todos los tests del archivo pasan (13 tests: 11 preexistentes ajustados + el nuevo de 5d en lugar del de multi-selección + los dos de nodos numerados sin cambios).

- [ ] **Step 6: Suite completa y commit**

Run: `npx ng test --watch=false`
Expected: mismo número de fallas preexistentes que antes de este task (ninguna nueva), y todos los tests de `mapa.component.spec.ts` y `vendor-list.component.spec.ts` en verde.

```bash
git add src/app/mapa/mapa.component.ts src/app/mapa/mapa.component.html src/app/mapa/mapa.component.spec.ts src/app/mapa/vendor-list/vendor-list.component.ts src/app/mapa/vendor-list/vendor-list.component.html src/app/mapa/vendor-list/vendor-list.component.scss src/app/mapa/vendor-list/vendor-list.component.spec.ts
git commit -m "feat: selección única de vendedor en el mapa, sin checkbox"
```

---

### Task 2: Panel flotante colapsable, semi-transparente, alto mínimo

**Files:**
- Modify: `src/app/mapa/vendor-list/vendor-list.component.ts` (estado `colapsado`)
- Modify: `src/app/mapa/vendor-list/vendor-list.component.html` (encabezado + cuerpo colapsable)
- Modify: `src/app/mapa/vendor-list/vendor-list.component.scss` (panel flotante completo)
- Modify: `src/app/mapa/mapa.component.html` (mover `app-vendor-list` dentro de `.map-wrapper`)
- Test: `src/app/mapa/vendor-list/vendor-list.component.spec.ts`

**Interfaces:**
- Consumes: contrato de `VendorListComponent` definido en Task 1 (`selectedId`, `onSeleccionar`, `isSelected`) — no cambia.
- Produces: `VendorListComponent.colapsado: Signal<boolean>` y `VendorListComponent.alternarColapso(): void`, ambos nuevos y de uso puramente interno del componente (no expuestos como `@Input`/`@Output`, no rompen el contrato con `MapaComponent`).

- [ ] **Step 1: Agregar estado de colapso a `VendorListComponent`**

En `src/app/mapa/vendor-list/vendor-list.component.ts`, cambiar el import de:

```typescript
import { Component, EventEmitter, Input, Output } from '@angular/core';
```

a:

```typescript
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
```

y agregar dentro de la clase, junto a los `@Output`:

```typescript
  colapsado = signal(false);

  alternarColapso(): void {
    this.colapsado.set(!this.colapsado());
  }
```

- [ ] **Step 2: Encabezado colapsable en el template**

Reemplazar el contenido completo de `src/app/mapa/vendor-list/vendor-list.component.html`:

```html
<div class="vendor-list">
  <div class="vendor-list__header" (click)="alternarColapso()">
    <span class="vendor-list__titulo">Vendedores</span>
    <span class="vendor-list__flecha" [class.vendor-list__flecha--colapsado]="colapsado()">▾</span>
  </div>
  @if (!colapsado()) {
    <div class="vendor-list__body">
      @for (vendedor of vendedores; track vendedor.vendedorId) {
        <div
          class="vendor-list__item"
          [class.vendor-list__item--selected]="isSelected(vendedor)"
          (click)="onSeleccionar(vendedor)"
          (dblclick)="onDoubleClick(vendedor.vendedorId)">
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
  }
</div>
```

- [ ] **Step 3: Estilos del panel flotante**

Reemplazar el contenido completo de `src/app/mapa/vendor-list/vendor-list.component.scss`:

```scss
:host {
    position: absolute;
    top: 16px;
    right: 16px;
    max-width: 280px;
    max-height: calc(100% - 32px);
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.85);
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    overflow: hidden;
    box-sizing: border-box;
    z-index: 500;
}

.vendor-list__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 12px;
    font-size: 13px;
    font-weight: 600;
    color: #2c3e50;
    cursor: pointer;
    flex-shrink: 0;
}

.vendor-list__flecha {
    display: inline-block;
    transition: transform 0.2s ease;
}

.vendor-list__flecha--colapsado {
    transform: rotate(-90deg);
}

.vendor-list__body {
    overflow-y: auto;
}

.vendor-list__item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    cursor: pointer;
    user-select: none;
}

.vendor-list__item:hover {
    background-color: rgba(0, 0, 0, 0.04);
}

.vendor-list__item--selected {
    background-color: rgba(0, 0, 0, 0.08);
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

- [ ] **Step 4: Mover el panel dentro de `.map-wrapper` para que flote sobre el mapa**

En `src/app/mapa/mapa.component.html`, reemplazar el archivo completo:

```html
<section class="main-content">
<div class="mapa-layout">
  <div class="map-wrapper">
    <div class="map-container" #map></div>
    @if (toastMensaje(); as mensaje) {
      <div class="mapa-toast">{{ mensaje }}</div>
    }
    <app-vendor-list
      [vendedores]="vendedores()"
      [selectedId]="seleccionado()"
      (vendedorSeleccionado)="centrarEnVendedor($event)"
      (trayectoriaToggled)="toggleTrayectoria({ codigo: $event.vendedorId, tipo: $event.vendedorCodigo, nombre: $event.vendedorNombre })">
    </app-vendor-list>
  </div>
</div>
</section>
```

(`.map-wrapper` ya tiene `position: relative` en `mapa.component.scss` — no requiere cambios; es el ancla del `position: absolute` del panel.)

- [ ] **Step 5: Tests de colapso en `vendor-list.component.spec.ts`**

Agregar al final de `src/app/mapa/vendor-list/vendor-list.component.spec.ts`, antes del cierre `});` del `describe`:

```typescript

  it('el panel inicia expandido: el cuerpo con la lista es visible', () => {
    component.vendedores = [vendedorEjemplo];
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.vendor-list__body')).toBeTruthy();
    expect(component.colapsado()).toBeFalse();
  });

  it('al hacer clic en el encabezado, colapsa y oculta el cuerpo de la lista', () => {
    component.vendedores = [vendedorEjemplo];
    fixture.detectChanges();

    const header: HTMLElement = fixture.nativeElement.querySelector('.vendor-list__header');
    header.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(component.colapsado()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.vendor-list__body')).toBeNull();
  });

  it('un segundo clic en el encabezado vuelve a expandir el panel', () => {
    component.vendedores = [vendedorEjemplo];
    fixture.detectChanges();

    const header: HTMLElement = fixture.nativeElement.querySelector('.vendor-list__header');
    header.dispatchEvent(new Event('click'));
    header.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(component.colapsado()).toBeFalse();
    expect(fixture.nativeElement.querySelector('.vendor-list__body')).toBeTruthy();
  });
```

Run: `npx ng test --watch=false --include=src/app/mapa/vendor-list/vendor-list.component.spec.ts`
Expected: 9/9 tests pasan (6 de Task 1 + 3 nuevos de colapso).

- [ ] **Step 6: Suite completa y commit**

Run: `npx ng test --watch=false`
Expected: mismo número de fallas preexistentes que antes de este task (ninguna nueva), y todos los tests de `vendor-list.component.spec.ts` en verde.

```bash
git add src/app/mapa/vendor-list/vendor-list.component.ts src/app/mapa/vendor-list/vendor-list.component.html src/app/mapa/vendor-list/vendor-list.component.scss src/app/mapa/mapa.component.html src/app/mapa/vendor-list/vendor-list.component.spec.ts
git commit -m "feat: panel de vendedores flotante, colapsable y semi-transparente"
```

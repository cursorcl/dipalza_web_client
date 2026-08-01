# Tabla de Tramos por Calle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Panel flotante debajo del mapa que muestra, por cada nodo numerado del recorrido del vendedor seleccionado, su tipo (Inicio/Parada N/Última posición), nombre de calle (geocodificación inversa contra el nuevo endpoint del backend), hora de detención y hora de fin (= hora de comienzo del siguiente nodo).

**Architecture:** Nuevo servicio Angular `GeocodificacionService` que llama al endpoint `GET /api/geocodificacion/inversa` de `dipalza_server` (ver plan hermano `docs/superpowers/plans/2026-07-31-geocodificacion-inversa.md` de ese repo — debe estar implementado y desplegable antes de que esta tabla muestre calles reales). Nuevo componente `TramosTableComponent`, independiente y testeable por sí solo (recibe `nodos: NodoParada[]` por `@Input`, no conoce a `MapaComponent`), que arma las filas de inmediato y dispara una consulta de geocodificación por nodo en paralelo — cada fila se actualiza sola cuando resuelve la suya. `MapaComponent` se conecta a esto con un nuevo signal `nodosSeleccionados`, poblado en el mismo punto donde hoy se calculan los nodos para dibujarlos en el mapa (`mostrarTrayectoria`).

**Tech Stack:** Angular 20 (standalone components, signals, `@if`/`@for`), RxJS, Jasmine + Karma, `HttpTestingController`, `jasmine.SpyObj`.

## Global Constraints

- Panel flotante debajo del mapa, ancho completo (`left`/`right: 16px`), semi-transparente (`rgba(255, 255, 255, 0.85)`), colapsable con encabezado + flecha — mismo patrón visual que `VendorListComponent` (PR #10), no un patrón nuevo.
- Columnas: **N°, Tipo, Calle, Hora de detención, Hora de fin**.
- `Hora de detención` = `comienzo` del nodo. `Hora de fin` = `comienzo` del **siguiente** nodo de la lista — no el `fin` propio. La última fila no tiene siguiente nodo: su `Hora de fin` queda `null` (se muestra como `—`).
- La tabla aparece con las filas de inmediato (N°, Tipo, horas ya conocidos localmente); la columna Calle muestra `"Buscando calle…"` hasta que resuelve su propia consulta — cada fila es independiente, ninguna espera a las demás.
- Solo visible cuando hay nodos (`nodosSeleccionados().length > 0` en `MapaComponent`) — se oculta al deseleccionar un vendedor, igual que el resto del panel de recorrido.
- No tocar `detectarParadas`, el renderizado de nodos en el mapa, ni el modelo de selección única de `MapaComponent` más allá de agregar el nuevo signal `nodosSeleccionados` y poblarlo/limpiarlo en los mismos puntos donde hoy se muestra/oculta la trayectoria.

---

### Task 1: `GeocodificacionService` + `TramosTableComponent` (independiente, sin tocar `MapaComponent`)

**Files:**
- Create: `src/app/mapa/geocodificacion.service.ts`
- Test: `src/app/mapa/geocodificacion.service.spec.ts`
- Create: `src/app/mapa/tramos-table/tramos-table.component.ts`
- Create: `src/app/mapa/tramos-table/tramos-table.component.html`
- Create: `src/app/mapa/tramos-table/tramos-table.component.scss`
- Test: `src/app/mapa/tramos-table/tramos-table.component.spec.ts`

**Interfaces:**
- Consumes: `NodoParada` (`src/app/mapa/detectar-paradas.ts`, ya existe — `{ numero, latitud, longitud, comienzo, fin, esInicio, esFin, esParada }`).
- Produces: `GeocodificacionService.obtenerCalle(lat: number, lon: number): Observable<{ calle: string }>`. `TramosTableComponent` con `@Input() nodos: NodoParada[]` — es el contrato que usará `MapaComponent` en la Tarea 2.

- [ ] **Step 1: Escribir el test de `GeocodificacionService` (falla porque el servicio no existe)**

Crear `src/app/mapa/geocodificacion.service.spec.ts`:

```typescript
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { GeocodificacionService } from './geocodificacion.service';
import { environment } from 'environments/environment';

describe('GeocodificacionService', () => {
  let service: GeocodificacionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(GeocodificacionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('hace GET a /geocodificacion/inversa con lat y lon como query params', () => {
    let respuesta: { calle: string } | undefined;
    service.obtenerCalle(-33.0393, -71.6273).subscribe(r => respuesta = r);

    const req = httpMock.expectOne(
      r => r.url === `${environment.apiUrl}/geocodificacion/inversa`
        && r.params.get('lat') === '-33.0393'
        && r.params.get('lon') === '-71.6273'
    );
    expect(req.request.method).toBe('GET');
    req.flush({ calle: 'Av. Errázuriz' });

    expect(respuesta).toEqual({ calle: 'Av. Errázuriz' });
  });
});
```

Run: `npx ng test --watch=false --include=src/app/mapa/geocodificacion.service.spec.ts`
Expected: FAIL — no compila (`GeocodificacionService` no existe todavía).

- [ ] **Step 2: Implementar `GeocodificacionService`**

Crear `src/app/mapa/geocodificacion.service.ts`:

```typescript
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

export interface CalleResponse {
  calle: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodificacionService {
  private url = `${environment.apiUrl}/geocodificacion/inversa`;

  constructor(private httpClient: HttpClient) { }

  obtenerCalle(lat: number, lon: number): Observable<CalleResponse> {
    return this.httpClient.get<CalleResponse>(this.url, { params: { lat, lon } });
  }
}
```

- [ ] **Step 3: Correr el test y verificar que pasa**

Run: `npx ng test --watch=false --include=src/app/mapa/geocodificacion.service.spec.ts`
Expected: PASS, 1/1.

- [ ] **Step 4: Escribir los tests de `TramosTableComponent` (fallan porque el componente no existe)**

Crear `src/app/mapa/tramos-table/tramos-table.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { TramosTableComponent } from './tramos-table.component';
import { GeocodificacionService } from '../geocodificacion.service';
import { NodoParada } from '../detectar-paradas';

describe('TramosTableComponent', () => {
  let component: TramosTableComponent;
  let fixture: ComponentFixture<TramosTableComponent>;
  let geocodificacionServiceSpy: jasmine.SpyObj<GeocodificacionService>;

  const nodoInicio: NodoParada = {
    numero: 1, latitud: -33.04, longitud: -71.62,
    comienzo: '2026-07-31T10:00:00', fin: '2026-07-31T10:00:00',
    esInicio: true, esFin: false, esParada: false
  };
  const nodoParada: NodoParada = {
    numero: 2, latitud: -33.05, longitud: -71.63,
    comienzo: '2026-07-31T10:20:00', fin: '2026-07-31T10:40:00',
    esInicio: false, esFin: false, esParada: true
  };
  const nodoFin: NodoParada = {
    numero: 3, latitud: -33.06, longitud: -71.64,
    comienzo: '2026-07-31T11:00:00', fin: '2026-07-31T11:00:00',
    esInicio: false, esFin: true, esParada: false
  };

  beforeEach(async () => {
    geocodificacionServiceSpy = jasmine.createSpyObj('GeocodificacionService', ['obtenerCalle']);

    await TestBed.configureTestingModule({
      imports: [TramosTableComponent],
      providers: [{ provide: GeocodificacionService, useValue: geocodificacionServiceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(TramosTableComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(of({ calle: 'Calle X' }));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('renderiza una fila por nodo, con N°, Tipo y horas ya disponibles de inmediato', () => {
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(new Subject().asObservable());
    component.nodos = [nodoInicio, nodoParada, nodoFin];
    component.ngOnChanges({ nodos: {} as any });

    expect(component.filas().length).toBe(3);
    expect(component.filas()[0].numero).toBe(1);
    expect(component.filas()[1].numero).toBe(2);
  });

  it('muestra "Buscando calle…" en el DOM mientras la geocodificación no ha resuelto', () => {
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(new Subject().asObservable());
    component.nodos = [nodoInicio];
    fixture.detectChanges();
    component.ngOnChanges({ nodos: {} as any });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Buscando calle');
  });

  it('cada fila resuelve su propia calle de forma independiente, sin esperar a las demás', () => {
    const sujeto1 = new Subject<{ calle: string }>();
    const sujeto2 = new Subject<{ calle: string }>();
    geocodificacionServiceSpy.obtenerCalle.and.returnValues(sujeto1.asObservable(), sujeto2.asObservable());

    component.nodos = [nodoInicio, nodoParada];
    component.ngOnChanges({ nodos: {} as any });

    expect(component.filas()[0].calle).toBeNull();
    expect(component.filas()[1].calle).toBeNull();

    sujeto2.next({ calle: 'Calle Dos' }); // el segundo nodo resuelve primero
    expect(component.filas()[1].calle).toBe('Calle Dos');
    expect(component.filas()[0].calle).toBeNull(); // el primero sigue pendiente

    sujeto1.next({ calle: 'Calle Uno' });
    expect(component.filas()[0].calle).toBe('Calle Uno');
  });

  it('hora de fin de una fila es la hora de comienzo del siguiente nodo', () => {
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(of({ calle: 'Calle X' }));
    component.nodos = [nodoInicio, nodoParada, nodoFin];
    component.ngOnChanges({ nodos: {} as any });

    expect(component.filas()[0].horaFin).toBe('10:20');
    expect(component.filas()[1].horaFin).toBe('11:00');
  });

  it('la última fila no tiene hora de fin (sin siguiente nodo)', () => {
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(of({ calle: 'Calle X' }));
    component.nodos = [nodoInicio, nodoParada, nodoFin];
    component.ngOnChanges({ nodos: {} as any });

    expect(component.filas()[2].horaFin).toBeNull();
  });

  it('la columna Tipo distingue Inicio, Parada N y Última posición', () => {
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(of({ calle: 'Calle X' }));
    component.nodos = [nodoInicio, nodoParada, nodoFin];
    component.ngOnChanges({ nodos: {} as any });

    expect(component.filas()[0].tipo).toBe('Inicio');
    expect(component.filas()[1].tipo).toBe('Parada 2');
    expect(component.filas()[2].tipo).toBe('Última posición');
  });

  it('al hacer clic en el encabezado, colapsa y oculta el cuerpo de la tabla', () => {
    geocodificacionServiceSpy.obtenerCalle.and.returnValue(of({ calle: 'Calle X' }));
    component.nodos = [nodoInicio];
    fixture.detectChanges();

    const header: HTMLElement = fixture.nativeElement.querySelector('.tramos-table__header');
    header.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(component.colapsado()).toBeTrue();
    expect(fixture.nativeElement.querySelector('.tramos-table__body')).toBeNull();
  });
});
```

Run: `npx ng test --watch=false --include=src/app/mapa/tramos-table/tramos-table.component.spec.ts`
Expected: FAIL — no compila (`TramosTableComponent` no existe todavía).

- [ ] **Step 5: Implementar `TramosTableComponent`**

Crear `src/app/mapa/tramos-table/tramos-table.component.ts`:

```typescript
import { Component, DestroyRef, inject, Input, OnChanges, signal, SimpleChanges } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NodoParada } from '../detectar-paradas';
import { GeocodificacionService } from '../geocodificacion.service';

export interface FilaTramo {
  numero: number;
  tipo: string;
  calle: string | null;
  horaDetencion: string;
  horaFin: string | null;
}

@Component({
  selector: 'app-tramos-table',
  imports: [],
  templateUrl: './tramos-table.component.html',
  styleUrl: './tramos-table.component.scss'
})
export class TramosTableComponent implements OnChanges {
  @Input() nodos: NodoParada[] = [];

  filas = signal<FilaTramo[]>([]);
  colapsado = signal(false);

  private geocodificacionService = inject(GeocodificacionService);
  private destroyRef = inject(DestroyRef);

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['nodos']) return;

    const filasIniciales: FilaTramo[] = this.nodos.map((nodo, indice) => ({
      numero: nodo.numero,
      tipo: this.tipoDeNodo(nodo),
      calle: null,
      horaDetencion: this.formatearHora(nodo.comienzo),
      horaFin: indice + 1 < this.nodos.length ? this.formatearHora(this.nodos[indice + 1].comienzo) : null
    }));
    this.filas.set(filasIniciales);

    this.nodos.forEach((nodo, indice) => {
      this.geocodificacionService.obtenerCalle(nodo.latitud, nodo.longitud)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(respuesta => {
          const actualizado = this.filas().map((fila, i) =>
            i === indice ? { ...fila, calle: respuesta.calle } : fila
          );
          this.filas.set(actualizado);
        });
    });
  }

  alternarColapso(): void {
    this.colapsado.set(!this.colapsado());
  }

  private tipoDeNodo(nodo: NodoParada): string {
    if (nodo.esParada) return `Parada ${nodo.numero}`;
    if (nodo.esInicio) return 'Inicio';
    return 'Última posición';
  }

  private formatearHora(fechaHora: string): string {
    return new Date(fechaHora).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  }
}
```

Crear `src/app/mapa/tramos-table/tramos-table.component.html`:

```html
<div class="tramos-table__header" (click)="alternarColapso()">
  <span class="tramos-table__titulo">Tramos del recorrido</span>
  <span class="tramos-table__flecha" [class.tramos-table__flecha--colapsado]="colapsado()">▾</span>
</div>
@if (!colapsado()) {
  <div class="tramos-table__body">
    <table class="tramos-table__tabla">
      <thead>
        <tr>
          <th>N°</th>
          <th>Tipo</th>
          <th>Calle</th>
          <th>Hora de detención</th>
          <th>Hora de fin</th>
        </tr>
      </thead>
      <tbody>
        @for (fila of filas(); track fila.numero) {
          <tr>
            <td>{{ fila.numero }}</td>
            <td>{{ fila.tipo }}</td>
            <td>{{ fila.calle ?? 'Buscando calle…' }}</td>
            <td>{{ fila.horaDetencion }}</td>
            <td>{{ fila.horaFin ?? '—' }}</td>
          </tr>
        }
      </tbody>
    </table>
  </div>
}
```

Crear `src/app/mapa/tramos-table/tramos-table.component.scss`:

```scss
:host {
    position: absolute;
    bottom: 16px;
    left: 16px;
    right: 16px;
    max-height: 240px;
    display: flex;
    flex-direction: column;
    background: rgba(255, 255, 255, 0.85);
    border-radius: 6px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    overflow: hidden;
    box-sizing: border-box;
    z-index: 500;
}

.tramos-table__header {
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

.tramos-table__flecha {
    display: inline-block;
    transition: transform 0.2s ease;
}

.tramos-table__flecha--colapsado {
    transform: rotate(-90deg);
}

.tramos-table__body {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
}

.tramos-table__tabla {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}

.tramos-table__tabla th,
.tramos-table__tabla td {
    padding: 6px 10px;
    text-align: left;
    white-space: nowrap;
}

.tramos-table__tabla th {
    position: sticky;
    top: 0;
    background: rgba(255, 255, 255, 0.95);
    font-weight: 600;
    color: #2c3e50;
}

.tramos-table__tabla tbody tr:hover {
    background-color: rgba(0, 0, 0, 0.04);
}
```

- [ ] **Step 6: Correr los tests y verificar que pasan**

Run: `npx ng test --watch=false --include=src/app/mapa/tramos-table/tramos-table.component.spec.ts`
Expected: PASS, 8/8.

- [ ] **Step 7: Suite completa y commit**

Run: `npx ng test --watch=false`
Expected: mismo número de fallas preexistentes que antes de este task (ninguna nueva), y todos los tests nuevos en verde.

```bash
git add src/app/mapa/geocodificacion.service.ts src/app/mapa/geocodificacion.service.spec.ts \
        src/app/mapa/tramos-table/tramos-table.component.ts \
        src/app/mapa/tramos-table/tramos-table.component.html \
        src/app/mapa/tramos-table/tramos-table.component.scss \
        src/app/mapa/tramos-table/tramos-table.component.spec.ts
git commit -m "feat: servicio de geocodificación inversa y tabla de tramos por calle"
```

---

### Task 2: Integrar `TramosTableComponent` en `MapaComponent`

**Files:**
- Modify: `src/app/mapa/mapa.component.ts`
- Modify: `src/app/mapa/mapa.component.html`
- Test: `src/app/mapa/mapa.component.spec.ts`

**Interfaces:**
- Consumes: `TramosTableComponent` con `@Input() nodos: NodoParada[]` (Tarea 1).
- Produces: `MapaComponent.nodosSeleccionados: Signal<NodoParada[]>` — nuevo, poblado/limpiado en los mismos puntos donde ya se muestra/oculta la trayectoria.

- [ ] **Step 1: Agregar el signal `nodosSeleccionados` y poblarlo/limpiarlo**

En `src/app/mapa/mapa.component.ts`, agregar el import de `NodoParada` junto al de `detectarParadas`:

```typescript
import { detectarParadas, NodoParada } from './detectar-paradas';
```

Agregar el import de `TramosTableComponent` junto al de `VendorListComponent`:

```typescript
import { TramosTableComponent } from './tramos-table/tramos-table.component';
```

Y registrarlo en el decorador del componente:

```typescript
@Component({
  selector: 'app-mapa',
  imports: [VendorListComponent, TramosTableComponent],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.scss'
})
```

Agregar el nuevo signal junto a `seleccionado`:

```typescript
  seleccionado = signal<string | null>(null);
  nodosSeleccionados = signal<NodoParada[]>([]);
```

En `ocultarTrayectoria`, limpiar el signal:

```typescript
  private ocultarTrayectoria(key: string): void {
    const layer = this.trayectoriasPorVendedor.get(key);
    if (!layer) return;
    this.historialLayer.removeLayer(layer);
    this.trayectoriasPorVendedor.delete(key);
    this.nodosSeleccionados.set([]);
  }
```

En `mostrarTrayectoria`, poblar el signal junto a donde se marca `seleccionado`:

```typescript
    grupo.addTo(this.historialLayer);
    this.trayectoriasPorVendedor.set(key, grupo);

    this.seleccionado.set(key);
    this.nodosSeleccionados.set(nodos);

    this.ajustarVistaATrayectoriasVisibles();
```

- [ ] **Step 2: Agregar `<app-tramos-table>` al template**

En `src/app/mapa/mapa.component.html`, agregar dentro de `.map-wrapper`, después de `<app-vendor-list>`:

```html
    @if (nodosSeleccionados().length > 0) {
      <app-tramos-table [nodos]="nodosSeleccionados()"></app-tramos-table>
    }
```

El archivo completo queda:

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
    @if (nodosSeleccionados().length > 0) {
      <app-tramos-table [nodos]="nodosSeleccionados()"></app-tramos-table>
    }
  </div>
</div>
</section>
```

- [ ] **Step 3: Agregar tests en `mapa.component.spec.ts`**

Agregar al final de `src/app/mapa/mapa.component.spec.ts`, antes del cierre `});` del `describe` (el `HttpTestingController` ya se usa en los tests existentes de este archivo — el nuevo componente `app-tramos-table` disparará sus propias solicitudes a `/geocodificacion/inversa`, así que hay que responderlas o el test falla por solicitudes sin resolver):

```typescript

  it('mostrarTrayectoria puebla nodosSeleccionados con los mismos nodos que dibuja en el mapa', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 },
      { id: 2, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:05:00', latitud: -33.41, longitud: -70.61 }
    ]);
    fixture.detectChanges();

    expect(component.nodosSeleccionados().length).toBe(2);

    // El nuevo <app-tramos-table> dispara sus propias solicitudes de geocodificación;
    // las respondemos para no dejar solicitudes pendientes en el test.
    httpMock.match(`${environment.apiUrl}/geocodificacion/inversa`)
      .forEach(req => req.flush({ calle: 'Calle de prueba' }));
  });

  it('al deseleccionar un vendedor, nodosSeleccionados queda vacío', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 }
    ]);
    fixture.detectChanges();
    httpMock.match(`${environment.apiUrl}/geocodificacion/inversa`)
      .forEach(req => req.flush({ calle: 'Calle de prueba' }));

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });

    expect(component.nodosSeleccionados()).toEqual([]);
  });
```

Run: `npx ng test --watch=false --include=src/app/mapa/mapa.component.spec.ts`
Expected: PASS, todos los tests del archivo (24 preexistentes + 2 nuevos = 26).

- [ ] **Step 4: Suite completa y commit**

Run: `npx ng test --watch=false`
Expected: mismo número de fallas preexistentes que antes de este task (ninguna nueva).

```bash
git add src/app/mapa/mapa.component.ts src/app/mapa/mapa.component.html src/app/mapa/mapa.component.spec.ts
git commit -m "feat: integra la tabla de tramos por calle en el mapa"
```

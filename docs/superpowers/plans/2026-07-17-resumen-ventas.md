# Resumen de Venta Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una nueva opción "Resumen de Venta" al menú lateral que muestre los totales agregados (cantidad, neto, descuentos, IVA, ILA, bruto) de las ventas pendientes de facturar (estado `FINISHED`).

**Architecture:** Nuevo componente Angular standalone `ResumenVentasComponent` en `src/app/ventas/resumen-ventas/`, que reutiliza `VentasService.obtainSales({ estados: ['FINISHED'] })` (mismo método y filtro que ya usa `ListadoVentasDiaComponent`) y suma los totales en el propio componente. Se agrega una ruta nueva (`ventas/resumen`) y una entrada de menú lateral nueva. No hay cambios de backend.

**Tech Stack:** Angular 20 standalone components, RxJS, Jasmine/Karma (`ng test`), Bootstrap 5 + hojas de estilo propias del template (`bg-*`, `icon-box-style`, `card`/`card-body`).

## Global Constraints

- Toda la UI (títulos, mensajes, botones) va en español, siguiendo el idioma del resto de la app.
- Reutilizar `VentasService.obtainSales` tal cual existe hoy — no modificar `VentasService` ni el backend.
- El filtro de datos es siempre `{ estados: ['FINISHED'] }` (ventas confirmadas, aún no facturadas) — sin filtros de fecha/cliente/vendedor en esta vista.
- Formato de moneda: `currency:'$ ': 'symbol':'1.0-0'`, igual que en `listado-ventas-dia.component.html`.
- No agregar botón de facturar ni edición en esta pantalla: es de solo lectura.
- Spec de referencia: `docs/superpowers/specs/2026-07-17-resumen-ventas-design.md`.

---

### Task 1: Lógica del componente `ResumenVentasComponent` (TDD)

**Files:**
- Create: `src/app/ventas/resumen-ventas/resumen-ventas.component.ts`
- Test: `src/app/ventas/resumen-ventas/resumen-ventas.component.spec.ts`

**Interfaces:**
- Consumes: `VentasService.obtainSales(filtros: FiltroVentas): Observable<Venta[]>` (ya existe en `src/app/ventas/ventas.service.ts:31`); `Venta` interface (`src/app/ventas/models/model.ts:1`, campos `totalNeto`, `totalDescuento`, `totalIva`, `totalIla`, `total`).
- Produces: clase `ResumenVentasComponent` con propiedades públicas `loadingIndicator: boolean`, `error: boolean`, `cantidadVentas: number`, `totalNeto: number`, `totalDescuento: number`, `totalIva: number`, `totalIla: number`, `totalBruto: number`, y método público `cargarResumen(): void`. Estas propiedades y este método los usa la plantilla del Task 2.

- [ ] **Step 1: Crear el esqueleto mínimo del componente (compila, sin lógica de negocio)**

Crea `src/app/ventas/resumen-ventas/resumen-ventas.component.ts`:

```typescript
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { VentasService } from '../ventas.service';

@Component({
  selector: 'app-resumen-ventas',
  imports: [CommonModule, RouterLink],
  templateUrl: './resumen-ventas.component.html',
  styleUrl: './resumen-ventas.component.scss'
})
export class ResumenVentasComponent implements OnInit {

  loadingIndicator = true;
  error = false;

  cantidadVentas = 0;
  totalNeto = 0;
  totalDescuento = 0;
  totalIva = 0;
  totalIla = 0;
  totalBruto = 0;

  private ventasService = inject(VentasService);

  ngOnInit(): void {
  }

  cargarResumen(): void {
  }
}
```

También crea archivos vacíos para que el componente compile (se completan en el Task 2):

```bash
touch src/app/ventas/resumen-ventas/resumen-ventas.component.html
touch src/app/ventas/resumen-ventas/resumen-ventas.component.scss
```

- [ ] **Step 2: Escribir los tests (deben fallar contra el esqueleto)**

Crea `src/app/ventas/resumen-ventas/resumen-ventas.component.spec.ts`:

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

import { ResumenVentasComponent } from './resumen-ventas.component';
import { VentasService } from '../ventas.service';
import { Venta } from '../models/model';

function buildVenta(overrides: Partial<Venta>): Venta {
  return {
    id: 1,
    fecha: '2026-07-17',
    rutCliente: '11111111-1',
    codigoCliente: 'C1',
    nombreCliente: 'Cliente Uno',
    codigoVendedor: 'V1',
    nombreVendedor: 'Vendedor Uno',
    codigoRuta: 'R1',
    nombreRuta: 'Ruta Uno',
    codigoCondicionVenta: 'CT',
    nombreCondicionVenta: 'Contado',
    totalDescuento: 0,
    totalIla: 0,
    totalIva: 0,
    totalNeto: 0,
    total: 0,
    estadoVenta: 'FINISHED',
    detalles: [],
    ...overrides
  };
}

describe('ResumenVentasComponent', () => {
  let component: ResumenVentasComponent;
  let fixture: ComponentFixture<ResumenVentasComponent>;
  let ventasServiceSpy: jasmine.SpyObj<VentasService>;

  beforeEach(async () => {
    ventasServiceSpy = jasmine.createSpyObj('VentasService', ['obtainSales']);

    await TestBed.configureTestingModule({
      imports: [ResumenVentasComponent],
      providers: [{ provide: VentasService, useValue: ventasServiceSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(ResumenVentasComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    ventasServiceSpy.obtainSales.and.returnValue(of([]));
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('debe pedir las ventas con estado FINISHED al iniciar', () => {
    ventasServiceSpy.obtainSales.and.returnValue(of([]));
    fixture.detectChanges();
    expect(ventasServiceSpy.obtainSales).toHaveBeenCalledWith({ estados: ['FINISHED'] });
  });

  it('debe calcular los totales agregados a partir de las ventas recibidas', () => {
    const ventas: Venta[] = [
      buildVenta({ id: 1, totalNeto: 1000, totalDescuento: 100, totalIva: 190, totalIla: 50, total: 1140 }),
      buildVenta({ id: 2, totalNeto: 2000, totalDescuento: 0, totalIva: 380, totalIla: 100, total: 2480 })
    ];
    ventasServiceSpy.obtainSales.and.returnValue(of(ventas));

    fixture.detectChanges();

    expect(component.cantidadVentas).toBe(2);
    expect(component.totalNeto).toBe(3000);
    expect(component.totalDescuento).toBe(100);
    expect(component.totalIva).toBe(570);
    expect(component.totalIla).toBe(150);
    expect(component.totalBruto).toBe(3620);
    expect(component.loadingIndicator).toBeFalse();
    expect(component.error).toBeFalse();
  });

  it('debe calcular totales en cero cuando no hay ventas pendientes', () => {
    ventasServiceSpy.obtainSales.and.returnValue(of([]));

    fixture.detectChanges();

    expect(component.cantidadVentas).toBe(0);
    expect(component.totalNeto).toBe(0);
    expect(component.totalBruto).toBe(0);
    expect(component.loadingIndicator).toBeFalse();
  });

  it('debe marcar error cuando la petición falla', () => {
    ventasServiceSpy.obtainSales.and.returnValue(throwError(() => new HttpErrorResponse({ status: 500 })));

    fixture.detectChanges();

    expect(component.error).toBeTrue();
    expect(component.loadingIndicator).toBeFalse();
  });

  it('cargarResumen() vuelve a pedir los datos y recalcula', () => {
    ventasServiceSpy.obtainSales.and.returnValue(of([buildVenta({ totalNeto: 500, total: 500 })]));
    fixture.detectChanges();
    expect(component.cantidadVentas).toBe(1);

    ventasServiceSpy.obtainSales.and.returnValue(of([
      buildVenta({ totalNeto: 500, total: 500 }),
      buildVenta({ totalNeto: 700, total: 700 })
    ]));
    component.cargarResumen();

    expect(component.cantidadVentas).toBe(2);
    expect(component.totalNeto).toBe(1200);
  });
});
```

- [ ] **Step 3: Ejecutar los tests y confirmar que fallan**

Run: `npx ng test --watch=false --browsers=ChromeHeadless`
Expected: FAIL — los tests de `ResumenVentasComponent` fallan porque `cargarResumen()` y `ngOnInit()` no llaman a `obtainSales` ni calculan nada (los `expect` sobre `cantidadVentas`, `totalNeto`, etc. no se cumplen).

- [ ] **Step 4: Implementar la lógica completa**

Reemplaza el contenido de `src/app/ventas/resumen-ventas/resumen-ventas.component.ts`:

```typescript
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { VentasService } from '../ventas.service';
import { Venta } from '../models/model';

@Component({
  selector: 'app-resumen-ventas',
  imports: [CommonModule, RouterLink],
  templateUrl: './resumen-ventas.component.html',
  styleUrl: './resumen-ventas.component.scss'
})
export class ResumenVentasComponent implements OnInit {

  loadingIndicator = true;
  error = false;

  cantidadVentas = 0;
  totalNeto = 0;
  totalDescuento = 0;
  totalIva = 0;
  totalIla = 0;
  totalBruto = 0;

  private ventasService = inject(VentasService);

  ngOnInit(): void {
    this.cargarResumen();
  }

  cargarResumen(): void {
    this.loadingIndicator = true;
    this.error = false;
    this.ventasService.obtainSales({ estados: ['FINISHED'] }).subscribe({
      next: (ventas: Venta[]) => {
        this.calcularTotales(ventas);
        this.loadingIndicator = false;
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error al obtener el resumen de ventas:', error);
        this.error = true;
        this.loadingIndicator = false;
      }
    });
  }

  private calcularTotales(ventas: Venta[]): void {
    this.cantidadVentas = ventas.length;
    this.totalNeto = ventas.reduce((suma, venta) => suma + venta.totalNeto, 0);
    this.totalDescuento = ventas.reduce((suma, venta) => suma + venta.totalDescuento, 0);
    this.totalIva = ventas.reduce((suma, venta) => suma + venta.totalIva, 0);
    this.totalIla = ventas.reduce((suma, venta) => suma + venta.totalIla, 0);
    this.totalBruto = ventas.reduce((suma, venta) => suma + venta.total, 0);
  }
}
```

- [ ] **Step 5: Ejecutar los tests y confirmar que pasan**

Run: `npx ng test --watch=false --browsers=ChromeHeadless`
Expected: PASS — los 6 tests de `ResumenVentasComponent` pasan (puede fallar por falta de `templateUrl`/`styleUrl` si el Step 1 no creó los archivos `.html`/`.scss`; en ese caso confirma que existen como archivos vacíos).

- [ ] **Step 6: Commit**

```bash
git add src/app/ventas/resumen-ventas/resumen-ventas.component.ts src/app/ventas/resumen-ventas/resumen-ventas.component.spec.ts src/app/ventas/resumen-ventas/resumen-ventas.component.html src/app/ventas/resumen-ventas/resumen-ventas.component.scss
git commit -m "feat: agrega lógica de ResumenVentasComponent con totales agregados"
```

---

### Task 2: Plantilla visual del resumen (tarjetas de totales)

**Files:**
- Modify: `src/app/ventas/resumen-ventas/resumen-ventas.component.html` (creado vacío en Task 1)

**Interfaces:**
- Consumes: propiedades públicas de `ResumenVentasComponent` (Task 1): `loadingIndicator`, `error`, `cantidadVentas`, `totalNeto`, `totalDescuento`, `totalIva`, `totalIla`, `totalBruto`, método `cargarResumen()`.
- Produces: nada consumido por tasks posteriores (última pieza visual).

- [ ] **Step 1: Escribir la plantilla**

Reemplaza el contenido de `src/app/ventas/resumen-ventas/resumen-ventas.component.html`:

```html
<section class="main-content">
    <ul class="breadcrumb breadcrumb-style">
        <li class="breadcrumb-item">
            <h5 class="page-title m-b-0">Resumen de Venta</h5>
        </li>
        <li class="breadcrumb-item bcrumb-1">
            <a routerLink="/" class="d-flex align-items-center">
                <i class="fas fa-home font-20"></i>
            </a>
        </li>
        <li class="breadcrumb-item bcrumb-2">
            <a routerLink="/ventas" class="d-flex align-items-center">
                Ventas por Facturar
            </a>
        </li>
    </ul>
    <div class="section-body">
        <div class="row">
            <div class="col-sm-12">
                <div class="form-group row">
                    <div class="col-sm-auto ms-auto">
                        <button class="btn btn-primary" (click)="cargarResumen()">Actualizar</button>
                    </div>
                </div>
            </div>
        </div>

        <div class="row" *ngIf="loadingIndicator">
            <div class="col-sm-12">
                <p>Cargando resumen de ventas...</p>
            </div>
        </div>

        <div class="row" *ngIf="!loadingIndicator && error">
            <div class="col-sm-12">
                <p class="text-danger">No fue posible obtener el resumen de ventas. Intenta nuevamente.</p>
            </div>
        </div>

        <div class="row" *ngIf="!loadingIndicator && !error">
            <div class="col-md-6 col-lg-4">
                <div class="card">
                    <div class="card-body">
                        <div class="row">
                            <div class="col">
                                <h5 class="m-b-5">Cantidad de Ventas</h5>
                                <h3 class="font-light">{{ cantidadVentas }}</h3>
                            </div>
                            <div class="col-auto">
                                <div class="bg-blue text-white icon-box-style">
                                    <i class="fas fa-list-ol"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6 col-lg-4">
                <div class="card">
                    <div class="card-body">
                        <div class="row">
                            <div class="col">
                                <h5 class="m-b-5">Total Neto</h5>
                                <h3 class="font-light">{{ totalNeto | currency:'$ ': 'symbol':'1.0-0' }}</h3>
                            </div>
                            <div class="col-auto">
                                <div class="bg-green text-white icon-box-style">
                                    <i class="fas fa-dollar-sign"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6 col-lg-4">
                <div class="card">
                    <div class="card-body">
                        <div class="row">
                            <div class="col">
                                <h5 class="m-b-5">Total Descuentos</h5>
                                <h3 class="font-light">{{ totalDescuento | currency:'$ ': 'symbol':'1.0-0' }}</h3>
                            </div>
                            <div class="col-auto">
                                <div class="bg-orange text-white icon-box-style">
                                    <i class="fas fa-percentage"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6 col-lg-4">
                <div class="card">
                    <div class="card-body">
                        <div class="row">
                            <div class="col">
                                <h5 class="m-b-5">Total IVA</h5>
                                <h3 class="font-light">{{ totalIva | currency:'$ ': 'symbol':'1.0-0' }}</h3>
                            </div>
                            <div class="col-auto">
                                <div class="bg-purple text-white icon-box-style">
                                    <i class="fas fa-receipt"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6 col-lg-4">
                <div class="card">
                    <div class="card-body">
                        <div class="row">
                            <div class="col">
                                <h5 class="m-b-5">Total ILA</h5>
                                <h3 class="font-light">{{ totalIla | currency:'$ ': 'symbol':'1.0-0' }}</h3>
                            </div>
                            <div class="col-auto">
                                <div class="bg-red text-white icon-box-style">
                                    <i class="fas fa-file-invoice-dollar"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-md-6 col-lg-4">
                <div class="card">
                    <div class="card-body">
                        <div class="row">
                            <div class="col">
                                <h5 class="m-b-5">Total Bruto</h5>
                                <h3 class="font-light">{{ totalBruto | currency:'$ ': 'symbol':'1.0-0' }}</h3>
                            </div>
                            <div class="col-auto">
                                <div class="bg-dark text-white icon-box-style">
                                    <i class="fas fa-money-bill-wave"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</section>
```

- [ ] **Step 2: Ejecutar los tests existentes para confirmar que la plantilla no rompe nada**

Run: `npx ng test --watch=false --browsers=ChromeHeadless`
Expected: PASS — los mismos 6 tests de `ResumenVentasComponent` del Task 1 siguen pasando (el `fixture.detectChanges()` ahora renderiza la plantilla real sin errores).

- [ ] **Step 3: Compilar el proyecto para detectar errores de template en build**

Run: `npx ng build`
Expected: Compilación exitosa (`Application bundle generation complete`), sin errores de tipos ni de plantilla en `resumen-ventas.component.html`.

- [ ] **Step 4: Commit**

```bash
git add src/app/ventas/resumen-ventas/resumen-ventas.component.html
git commit -m "feat: agrega plantilla visual de tarjetas para Resumen de Venta"
```

---

### Task 3: Ruta, menú lateral y verificación manual en el navegador

**Files:**
- Modify: `src/app/ventas/ventas.routes.ts`
- Modify: `src/assets/data/routes.json`

**Interfaces:**
- Consumes: `ResumenVentasComponent` (Task 1 y 2), exportado desde `src/app/ventas/resumen-ventas/resumen-ventas.component.ts`.
- Produces: ruta navegable `/ventas/resumen` y entrada de menú lateral "Resumen de Venta" visibles en la app.

- [ ] **Step 1: Agregar la ruta**

En `src/app/ventas/ventas.routes.ts`, agrega una entrada nueva al array `VENTAS_ROUTES`, después de la ruta `'resultados-facturacion'` (línea 29-32):

```typescript
    {
        path: 'resultados-facturacion',
        loadComponent: () => import('./listado-resultados-facturacion-dia/listado-resultados-facturacion-dia.component').then((m) => m.ListadoResultadosFacturacionDiaComponent)
    },
    {
        path: 'resumen',
        loadComponent: () => import('./resumen-ventas/resumen-ventas.component').then((m) => m.ResumenVentasComponent)
    }
```

(recuerda quitar la coma final del elemento anterior si el array la tenía como último elemento, y dejar el nuevo objeto como último elemento del array `VENTAS_ROUTES`).

- [ ] **Step 2: Agregar la entrada de menú lateral**

En `src/assets/data/routes.json`, agrega una entrada nueva inmediatamente después del bloque de "Ventas por Facturar" (después de la línea 35 `},` que cierra ese objeto, antes del bloque de "Ventas en Curso"):

```json
    {
      "path": "ventas/resumen",
      "title": "Resumen de Venta",
      "iconType": "feather",
      "icon": "bar-chart-2",
      "class": "",
      "groupTitle": false,
      "badge": "",
      "badgeClass": "",
      "submenu": []
    },
```

- [ ] **Step 3: Validar el JSON**

Run: `python3 -c "import json; json.load(open('src/assets/data/routes.json'))"`
Expected: Sin salida ni error (el JSON es válido).

- [ ] **Step 4: Levantar el servidor de desarrollo**

Run: `npx ng serve` (en background o en una terminal aparte)
Expected: Compila sin errores y queda escuchando en `http://localhost:4200`.

- [ ] **Step 5: Verificación manual en el navegador**

Con la app abierta y sesión iniciada:
1. Confirmar que en el menú lateral, dentro del grupo "Ventas", aparece la opción "Resumen de Venta" justo debajo de "Ventas por Facturar".
2. Hacer clic en "Resumen de Venta" y confirmar que navega a `/ventas/resumen`.
3. Confirmar que se muestran las 6 tarjetas: Cantidad de Ventas, Total Neto, Total Descuentos, Total IVA, Total ILA, Total Bruto.
4. Abrir en otra pestaña "Ventas por Facturar" (`/ventas`), contar manualmente las filas visibles y sumar de cabeza (o con la calculadora) 2-3 de los totales (por ejemplo Neto y Total) de esas filas.
5. Confirmar que "Cantidad de Ventas" en el resumen coincide con el número de filas de "Ventas por Facturar", y que los totales sumados coinciden con los valores mostrados en las tarjetas.
6. Hacer clic en "Actualizar" en la pantalla de resumen y confirmar que vuelve a cargar sin errores en la consola del navegador.

Expected: Todo lo anterior se cumple sin errores en la consola del navegador ni en la terminal de `ng serve`.

- [ ] **Step 6: Commit**

```bash
git add src/app/ventas/ventas.routes.ts src/assets/data/routes.json
git commit -m "feat: agrega ruta y menú lateral para Resumen de Venta"
```

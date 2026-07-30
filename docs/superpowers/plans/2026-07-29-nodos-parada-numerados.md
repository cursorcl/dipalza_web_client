# Nodos numerados de parada en el mapa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el punto-por-cada-posición-GPS del recorrido del día por marcadores numerados en las paradas reales (>10 min en un radio de ~100m), manteniendo la polyline completa y todo el resto del flujo de selección múltiple existente.

**Architecture:** Una función pura nueva `detectarParadas` (sin dependencias de Angular, solo Leaflet para el cálculo de distancia) agrupa los puntos GPS crudos de un vendedor en "nodos" — paradas reales más los nodos forzados de inicio/fin. `MapaComponent.mostrarTrayectoria` pasa a llamar esa función y dibuja un `L.marker` con un ícono numerado (`L.divIcon`) por nodo, en vez de un `L.circleMarker` por cada punto crudo.

**Tech Stack:** Angular 20 (standalone components, signals), Leaflet (`L.marker`, `L.divIcon`, `L.latLng().distanceTo()`), Jasmine + Karma (`npx ng test`).

## Global Constraints

- No se agrega ninguna dependencia npm nueva.
- No se modifica el backend: sigue devolviendo los mismos puntos crudos vía `POST /api/posicion/historico`.
- Radio de agrupación: 100 metros (constante `radioMetros`, sin UI de configuración).
- Duración mínima de parada: 10 minutos = 600000 ms (constante `duracionMinimaMs`, sin UI de configuración).
- El primer y el último punto del día **siempre** generan un nodo, aunque su grupo no califique como parada real.
- La numeración de nodos es independiente por vendedor (cada trayectoria numera desde 1).
- No se toca `toggleTrayectoria`, `ajustarVistaATrayectoriasVisibles`, el manejo de errores/toast, `centrarEnVendedor`, ni `VendorListComponent` — todo el flujo de selección múltiple del PR #6 queda igual.
- Ejecutar pruebas con `npx ng test --watch=false` desde `dipalza_web_client/`.

---

### Task 1: Función pura `detectarParadas`

**Files:**
- Create: `src/app/mapa/detectar-paradas.ts`
- Test: `src/app/mapa/detectar-paradas.spec.ts`

**Interfaces:**
- Consumes: `HistorialPosicionDTO` (ya existe en `src/app/mapa/models/model.ts`, campos `id, vendedorId, vendedorCodigo, vendedorNombre, fechaHora, latitud, longitud`).
- Produces: `interface NodoParada { numero: number; latitud: number; longitud: number; comienzo: string; fin: string; esInicio: boolean; esFin: boolean; }` y `function detectarParadas(puntos: HistorialPosicionDTO[], radioMetros = 100, duracionMinimaMs = 10 * 60 * 1000): NodoParada[]`, ambos exportados desde `./detectar-paradas`.

- [ ] **Step 1: Escribir los tests que fallan**

Crear `src/app/mapa/detectar-paradas.spec.ts`:

```typescript
import { detectarParadas } from './detectar-paradas';
import { HistorialPosicionDTO } from './models/model';

function crearPunto(
  latitud: number,
  longitud: number,
  fechaHora: string
): HistorialPosicionDTO {
  return {
    id: 0,
    vendedorId: '001',
    vendedorCodigo: '0',
    vendedorNombre: 'Juan Perez',
    fechaHora,
    latitud,
    longitud
  };
}

describe('detectarParadas', () => {
  it('devuelve un arreglo vacío si no hay puntos', () => {
    expect(detectarParadas([])).toEqual([]);
  });

  it('un solo punto produce un único nodo marcado como inicio y fin', () => {
    const puntos = [crearPunto(-33.40, -70.60, '2026-07-26T09:00:00')];

    const nodos = detectarParadas(puntos);

    expect(nodos.length).toBe(1);
    expect(nodos[0]).toEqual({
      numero: 1,
      latitud: -33.40,
      longitud: -70.60,
      comienzo: '2026-07-26T09:00:00',
      fin: '2026-07-26T09:00:00',
      esInicio: true,
      esFin: true
    });
  });

  it('dos puntos lejanos entre sí (sin parada real) producen solo los nodos forzados de inicio y fin', () => {
    const puntos = [
      crearPunto(-33.40, -70.60, '2026-07-26T09:00:00'),
      crearPunto(-34.00, -71.00, '2026-07-26T09:05:00')
    ];

    const nodos = detectarParadas(puntos);

    expect(nodos.length).toBe(2);
    expect(nodos[0]).toEqual({
      numero: 1,
      latitud: -33.40,
      longitud: -70.60,
      comienzo: '2026-07-26T09:00:00',
      fin: '2026-07-26T09:00:00',
      esInicio: true,
      esFin: false
    });
    expect(nodos[1]).toEqual({
      numero: 2,
      latitud: -34.00,
      longitud: -71.00,
      comienzo: '2026-07-26T09:05:00',
      fin: '2026-07-26T09:05:00',
      esInicio: false,
      esFin: true
    });
  });

  it('detecta una parada real (>10 min en el mismo radio) entre el inicio y el fin', () => {
    const puntos = [
      crearPunto(-33.40, -70.60, '2026-07-26T09:00:00'),
      crearPunto(-34.00, -71.00, '2026-07-26T09:10:00'),
      crearPunto(-34.00, -71.00, '2026-07-26T09:25:00'),
      crearPunto(-35.00, -72.00, '2026-07-26T09:40:00')
    ];

    const nodos = detectarParadas(puntos);

    expect(nodos.length).toBe(3);
    expect(nodos[0]).toEqual(jasmine.objectContaining({
      numero: 1, esInicio: true, esFin: false, comienzo: '2026-07-26T09:00:00', fin: '2026-07-26T09:00:00'
    }));
    expect(nodos[1]).toEqual({
      numero: 2,
      latitud: -34.00,
      longitud: -71.00,
      comienzo: '2026-07-26T09:10:00',
      fin: '2026-07-26T09:25:00',
      esInicio: false,
      esFin: false
    });
    expect(nodos[2]).toEqual(jasmine.objectContaining({
      numero: 3, esInicio: false, esFin: true, comienzo: '2026-07-26T09:40:00', fin: '2026-07-26T09:40:00'
    }));
  });

  it('si el vendedor se queda todo el día en el mismo lugar, produce un único nodo con esInicio y esFin en true', () => {
    const puntos = [
      crearPunto(-33.40, -70.60, '2026-07-26T08:00:00'),
      crearPunto(-33.40, -70.60, '2026-07-26T08:20:00'),
      crearPunto(-33.40, -70.60, '2026-07-26T09:00:00')
    ];

    const nodos = detectarParadas(puntos);

    expect(nodos).toEqual([{
      numero: 1,
      latitud: -33.40,
      longitud: -70.60,
      comienzo: '2026-07-26T08:00:00',
      fin: '2026-07-26T09:00:00',
      esInicio: true,
      esFin: true
    }]);
  });

  it('dos puntos en el mismo lugar pero con menos de 10 minutos de diferencia igual producen nodos forzados de inicio y fin separados', () => {
    const puntos = [
      crearPunto(-33.40, -70.60, '2026-07-26T09:00:00'),
      crearPunto(-33.40, -70.60, '2026-07-26T09:05:00')
    ];

    const nodos = detectarParadas(puntos);

    expect(nodos.length).toBe(2);
    expect(nodos[0]).toEqual(jasmine.objectContaining({ numero: 1, esInicio: true, esFin: false, comienzo: '2026-07-26T09:00:00' }));
    expect(nodos[1]).toEqual(jasmine.objectContaining({ numero: 2, esInicio: false, esFin: true, comienzo: '2026-07-26T09:05:00' }));
  });
});
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `npx ng test --watch=false`
Expected: FAIL — `./detectar-paradas` no existe (error de compilación).

- [ ] **Step 3: Implementar `detectar-paradas.ts`**

```typescript
import * as L from 'leaflet';
import { HistorialPosicionDTO } from './models/model';

export interface NodoParada {
  numero: number;
  latitud: number;
  longitud: number;
  comienzo: string;
  fin: string;
  esInicio: boolean;
  esFin: boolean;
}

export function detectarParadas(
  puntos: HistorialPosicionDTO[],
  radioMetros = 100,
  duracionMinimaMs = 10 * 60 * 1000
): NodoParada[] {
  if (puntos.length === 0) {
    return [];
  }

  if (puntos.length === 1) {
    const p = puntos[0];
    return [{
      numero: 1,
      latitud: p.latitud,
      longitud: p.longitud,
      comienzo: p.fechaHora,
      fin: p.fechaHora,
      esInicio: true,
      esFin: true
    }];
  }

  const grupos: HistorialPosicionDTO[][] = [[puntos[0]]];
  for (let i = 1; i < puntos.length; i++) {
    const punto = puntos[i];
    const grupoActual = grupos[grupos.length - 1];
    const referencia = grupoActual[0];
    const distancia = L.latLng(referencia.latitud, referencia.longitud)
      .distanceTo(L.latLng(punto.latitud, punto.longitud));

    if (distancia <= radioMetros) {
      grupoActual.push(punto);
    } else {
      grupos.push([punto]);
    }
  }

  const nodosSinNumero: Omit<NodoParada, 'numero'>[] = [];

  grupos.forEach((grupo, indice) => {
    const primero = grupo[0];
    const ultimo = grupo[grupo.length - 1];
    const duracionMs = new Date(ultimo.fechaHora).getTime() - new Date(primero.fechaHora).getTime();
    const esPrimerGrupo = indice === 0;
    const esUltimoGrupo = indice === grupos.length - 1;

    if (duracionMs >= duracionMinimaMs) {
      const latitud = grupo.reduce((suma, p) => suma + p.latitud, 0) / grupo.length;
      const longitud = grupo.reduce((suma, p) => suma + p.longitud, 0) / grupo.length;
      nodosSinNumero.push({
        latitud,
        longitud,
        comienzo: primero.fechaHora,
        fin: ultimo.fechaHora,
        esInicio: esPrimerGrupo,
        esFin: esUltimoGrupo
      });
      return;
    }

    if (esPrimerGrupo) {
      nodosSinNumero.push({
        latitud: primero.latitud,
        longitud: primero.longitud,
        comienzo: primero.fechaHora,
        fin: primero.fechaHora,
        esInicio: true,
        esFin: false
      });
    }
    if (esUltimoGrupo) {
      nodosSinNumero.push({
        latitud: ultimo.latitud,
        longitud: ultimo.longitud,
        comienzo: ultimo.fechaHora,
        fin: ultimo.fechaHora,
        esInicio: false,
        esFin: true
      });
    }
  });

  return nodosSinNumero.map((nodo, indice) => ({ ...nodo, numero: indice + 1 }));
}
```

- [ ] **Step 4: Ejecutar y verificar que pasan**

Run: `npx ng test --watch=false`
Expected: PASS para los 6 tests nuevos de `detectarParadas`.

- [ ] **Step 5: Commit**

```bash
git add src/app/mapa/detectar-paradas.ts src/app/mapa/detectar-paradas.spec.ts
git commit -m "feat: agrega detectarParadas, algoritmo de agrupación de paradas del día"
```

---

### Task 2: Integrar `detectarParadas` en `mostrarTrayectoria` con marcadores numerados

**Files:**
- Modify: `src/app/mapa/mapa.component.ts`
- Modify: `src/app/mapa/mapa.component.scss`
- Test: `src/app/mapa/mapa.component.spec.ts`

**Interfaces:**
- Consumes: `detectarParadas` y `NodoParada` de la Task 1.
- Produces: `private crearIconoNodo(numero: number, colorFondo: string): L.DivIcon` (nuevo método privado). `mostrarTrayectoria` cambia de firma interna (sigue siendo `private mostrarTrayectoria(key: string, puntos: HistorialPosicionDTO[]): void`, sin cambios para quien la llama — `toggleTrayectoria` no se toca).

- [ ] **Step 1: Escribir los tests que fallan**

Agregar en `mapa.component.spec.ts`, antes del `});` final. Requiere que `import * as L from 'leaflet';` ya esté al inicio del archivo (ya está, agregado en un cambio anterior):

```typescript
  it('mostrarTrayectoria dibuja un nodo numerado por cada parada detectada, no un punto por cada posición GPS', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 },
      { id: 2, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:05:00', latitud: -34.00, longitud: -71.00 }
    ]);

    const grupo = (component as any).trayectoriasPorVendedor.get('001_0') as L.LayerGroup;
    const marcadores = grupo.getLayers().filter(capa => capa instanceof L.Marker) as L.Marker[];

    expect(marcadores.length).toBe(2);
    const popups = marcadores.map(m => m.getPopup()?.getContent());
    expect(popups).toContain('Inicio — 09:00');
    expect(popups).toContain('Última posición — 09:05');
  });

  it('mostrarTrayectoria etiqueta una parada real de más de 10 minutos con su rango horario', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    component.toggleTrayectoria({ codigo: '001', tipo: '0', nombre: 'Juan Perez' });
    httpMock.expectOne(`${environment.apiUrl}/posicion/historico`).flush([
      { id: 1, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:00:00', latitud: -33.40, longitud: -70.60 },
      { id: 2, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:10:00', latitud: -34.00, longitud: -71.00 },
      { id: 3, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:25:00', latitud: -34.00, longitud: -71.00 },
      { id: 4, vendedorId: '001', vendedorCodigo: '0', vendedorNombre: 'Juan Perez', fechaHora: '2026-07-26T09:40:00', latitud: -35.00, longitud: -72.00 }
    ]);

    const grupo = (component as any).trayectoriasPorVendedor.get('001_0') as L.LayerGroup;
    const marcadores = grupo.getLayers().filter(capa => capa instanceof L.Marker) as L.Marker[];

    expect(marcadores.length).toBe(3);
    const popups = marcadores.map(m => m.getPopup()?.getContent());
    expect(popups).toContain('Inicio — 09:00');
    expect(popups).toContain('Parada 2 — 09:10 a 09:25');
    expect(popups).toContain('Última posición — 09:40');
  });
```

- [ ] **Step 2: Ejecutar y verificar que fallan**

Run: `npx ng test --watch=false`
Expected: FAIL — hoy `mostrarTrayectoria` crea `L.circleMarker` (no `L.Marker`) por cada punto crudo, así que `marcadores.length` no coincide y los popups no tienen el formato "Parada N — ...".

- [ ] **Step 3: Actualizar el import en `mapa.component.ts`**

Agregar junto a los demás imports (después de la línea de `import { colorForVendedor } from './vendor-color';`):

```typescript
import { detectarParadas } from './detectar-paradas';
```

- [ ] **Step 4: Eliminar el campo `canvasRenderer`**

Eliminar esta línea (ya no se necesita: bajamos de cientos/miles de `circleMarker` por punto a un puñado de `marker` por parada real):

```typescript
  private canvasRenderer = L.canvas();
```

- [ ] **Step 5: Reemplazar `mostrarTrayectoria` y agregar `crearIconoNodo`**

Reemplazar el método `mostrarTrayectoria` completo por:

```typescript
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

    const nodos = detectarParadas(puntos);
    nodos.forEach(nodo => {
      const colorFondo = nodo.esInicio ? '#2ecc71' : nodo.esFin ? '#e74c3c' : color;
      const marker = L.marker([nodo.latitud, nodo.longitud], {
        icon: this.crearIconoNodo(nodo.numero, colorFondo)
      });

      const horaComienzo = new Date(nodo.comienzo).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
      const esParadaReal = nodo.comienzo !== nodo.fin;
      let etiqueta: string;
      if (esParadaReal) {
        const horaFin = new Date(nodo.fin).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        etiqueta = `Parada ${nodo.numero} — ${horaComienzo} a ${horaFin}`;
      } else if (nodo.esInicio) {
        etiqueta = `Inicio — ${horaComienzo}`;
      } else {
        etiqueta = `Última posición — ${horaComienzo}`;
      }
      marker.bindPopup(etiqueta);
      marker.addTo(grupo);
    });

    grupo.addTo(this.historialLayer);
    this.trayectoriasPorVendedor.set(key, grupo);

    const actualizado = new Set(this.seleccionados());
    actualizado.add(key);
    this.seleccionados.set(actualizado);

    this.ajustarVistaATrayectoriasVisibles();
  }

  private crearIconoNodo(numero: number, colorFondo: string): L.DivIcon {
    const html = `<div class="nodo-parada-badge" style="background:${colorFondo};">${numero}</div>`;
    return L.divIcon({
      html,
      className: 'custom-nodo-parada-icon',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      popupAnchor: [0, -12]
    });
  }
```

- [ ] **Step 6: Agregar estilos para el ícono numerado en `mapa.component.scss`**

Agregar al final del archivo:

```scss
/* Elimina el cuadro blanco por defecto de Leaflet para los divIcon numerados */
::ng-deep .custom-nodo-parada-icon {
    background: transparent !important;
    border: none !important;
}

::ng-deep .nodo-parada-badge {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    border: 2px solid #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
}
```

- [ ] **Step 7: Ejecutar y verificar que pasan**

Run: `npx ng test --watch=false`
Expected: PASS para los 2 tests nuevos y **toda** la suite preexistente del módulo `mapa` (los tests que ya verificaban `historialLayer.getLayers().length` cuentan grupos por vendedor, no marcadores por punto, así que no se ven afectados por este cambio).

- [ ] **Step 8: Commit**

```bash
git add src/app/mapa/mapa.component.ts src/app/mapa/mapa.component.scss src/app/mapa/mapa.component.spec.ts
git commit -m "feat: reemplaza los puntos GPS crudos por nodos numerados de parada en el mapa"
```

---

## Verificación manual final (no automatizada)

Después de la Task 2, con el backend corriendo, levantar el cliente y verificar en el navegador:
1. Seleccionar un vendedor con recorrido del día → en vez de decenas/cientos de puntos pequeños, aparecen unos pocos marcadores numerados (badges circulares) en las paradas reales, con el 1 en verde y el número más alto en rojo.
2. Hacer clic en un marcador numerado intermedio → el popup muestra "Parada N — hora a hora" si fue una parada real de >10 min.
3. Seleccionar un vendedor que no tuvo ninguna parada real hoy → solo aparecen 2 marcadores (Inicio y Última posición), la polyline sigue mostrando el camino completo entre ambos.

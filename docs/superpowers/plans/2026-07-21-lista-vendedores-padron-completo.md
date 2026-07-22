# Lista de vendedores: padrón completo + quitar tiempo del marker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** La lista lateral del mapa debe mostrar todos los vendedores del sistema (no solo los que ya reportaron posición), y el tooltip del marcador del mapa deja de mostrar el tiempo relativo.

**Architecture:** Se agrega un endpoint de solo lectura `GET /api/vendedores` en el backend (Controller → Service → Repository, mismo patrón que `PosicionController`/`PosicionService`), y un `VendedorService` + modelo en el frontend para consumirlo. `MapaComponent.actualizarListaVendedores()` cambia de iterar solo `posicionesActuales` a iterar el padrón completo, completando cada fila con los datos de posición cuando existen. El tooltip del marcador (`generateLabel`) pierde la línea de tiempo.

**Tech Stack:** Backend: Spring Boot 3.5.4 / Java 21 / JUnit 5 + Mockito (`./mvnw test`). Frontend: Angular 20, Karma/Jasmine (`ng test`).

## Global Constraints

- El padrón completo viene de `VendedorRepository.findAll()` mapeado con `VendedorMapper.toDto()` (ya existe, no se toca).
- `GET /api/vendedores` hereda la regla de seguridad existente `/api/**` → `.authenticated()` — no se toca `SecurityConfigDevSec`/`ProdSec`.
- No se crea marcador en el mapa para un vendedor sin posición reportada — solo aparece en la lista lateral.
- Un vendedor sin posición reportada muestra `tiempoRelativo: 'Sin datos'` (ya es el comportamiento de `TimeFormatter.formatRelativeTime('')`, no se duplica ese string) y `online: false`.
- El color de la lista sigue siendo `colorForVendedor(`${codigo}_${tipo}`)`, determinístico, calculado siempre (con o sin posición reportada).
- No se ordena la lista, no se agrega búsqueda ni paginación.

---

### Task 1: Backend — endpoint `GET /api/vendedores`

**Repo:** `/Users/cursor/Dev/dipalza/application_v2.0/dipalza_server` (rama `fix/posicion-lat-lon-schema`, sin worktree — se trabaja directo ahí)

**Files:**
- Create: `dipalza/src/main/java/cl/eos/dipalza/service/VendedorService.java`
- Create: `dipalza/src/main/java/cl/eos/dipalza/controller/VendedorController.java`
- Test: `dipalza/src/test/java/cl/eos/dipalza/service/VendedorServiceTest.java`
- Test: `dipalza/src/test/java/cl/eos/dipalza/controller/VendedorControllerTest.java`

**Interfaces:**
- Consumes: `VendedorRepository` (existente, `findAll()` heredado de `JpaRepository`), `VendedorMapper.toDto(Vendedor)` (existente, `cl.eos.dipalza.mapper.VendedorMapper`), `VendedorDTO` record (existente, `cl.eos.dipalza.model.VendedorDTO`).
- Produces: `VendedorService.listarTodos(): List<VendedorDTO>` y `GET /api/vendedores` (sin path variables) devolviendo `List<VendedorDTO>` — usado por el frontend en la Task 2.

- [ ] **Step 1: Escribir el test de `VendedorService` que falla**

Crear `dipalza/src/test/java/cl/eos/dipalza/service/VendedorServiceTest.java`:

```java
package cl.eos.dipalza.service;

import cl.eos.dipalza.entity.Vendedor;
import cl.eos.dipalza.entity.ids.VendedorId;
import cl.eos.dipalza.model.VendedorDTO;
import cl.eos.dipalza.repository.VendedorRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class VendedorServiceTest {

    @Mock VendedorRepository vendedorRepository;
    @InjectMocks VendedorService service;

    @Test
    void listarTodos_retornaTodosLosVendedoresMapeados() {
        Vendedor v1 = new Vendedor();
        v1.setId(new VendedorId("001", "0"));
        v1.setNombre("Juan Perez");

        Vendedor v2 = new Vendedor();
        v2.setId(new VendedorId("002", "0"));
        v2.setNombre("Maria Soto");

        when(vendedorRepository.findAll()).thenReturn(List.of(v1, v2));

        List<VendedorDTO> result = service.listarTodos();

        assertThat(result).hasSize(2);
        assertThat(result.get(0).codigo()).isEqualTo("001");
        assertThat(result.get(0).nombre()).isEqualTo("Juan Perez");
        assertThat(result.get(1).codigo()).isEqualTo("002");
    }

    @Test
    void listarTodos_sinVendedores_retornaListaVacia() {
        when(vendedorRepository.findAll()).thenReturn(List.of());

        List<VendedorDTO> result = service.listarTodos();

        assertThat(result).isEmpty();
    }
}
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `./mvnw -o -Dfrontend.skip=true -Dtest=VendedorServiceTest test`
Expected: FAIL — no existe la clase `VendedorService`.

- [ ] **Step 3: Implementar `VendedorService`**

Crear `dipalza/src/main/java/cl/eos/dipalza/service/VendedorService.java`:

```java
package cl.eos.dipalza.service;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import cl.eos.dipalza.mapper.VendedorMapper;
import cl.eos.dipalza.model.VendedorDTO;
import cl.eos.dipalza.repository.VendedorRepository;

@Service
public class VendedorService {

    private final VendedorRepository vendedorRepository;

    public VendedorService(VendedorRepository vendedorRepository) {
        this.vendedorRepository = vendedorRepository;
    }

    @Transactional(readOnly = true)
    public List<VendedorDTO> listarTodos() {
        return vendedorRepository.findAll()
                .stream()
                .map(VendedorMapper::toDto)
                .toList();
    }
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `./mvnw -o -Dfrontend.skip=true -Dtest=VendedorServiceTest test`
Expected: PASS (2 tests).

- [ ] **Step 5: Escribir el test de `VendedorController` que falla**

Crear `dipalza/src/test/java/cl/eos/dipalza/controller/VendedorControllerTest.java`:

```java
package cl.eos.dipalza.controller;

import cl.eos.dipalza.model.VendedorDTO;
import cl.eos.dipalza.service.VendedorService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.security.servlet.SecurityAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(value = VendedorController.class, excludeAutoConfiguration = SecurityAutoConfiguration.class)
class VendedorControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean VendedorService service;

    @Test
    void listarVendedores_retorna200ConListaCompleta() throws Exception {
        VendedorDTO dto = new VendedorDTO("001", "0", "11.111.111-1", "Juan Perez", "Santiago", "Providencia", "Calle 1", "912345678");
        when(service.listarTodos()).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/vendedores"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].codigo", is("001")))
                .andExpect(jsonPath("$[0].nombre", is("Juan Perez")));
    }
}
```

- [ ] **Step 6: Correr el test y verificar que falla**

Run: `./mvnw -o -Dfrontend.skip=true -Dtest=VendedorControllerTest test`
Expected: FAIL — no existe la clase `VendedorController`.

- [ ] **Step 7: Implementar `VendedorController`**

Crear `dipalza/src/main/java/cl/eos/dipalza/controller/VendedorController.java`:

```java
package cl.eos.dipalza.controller;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import cl.eos.dipalza.model.VendedorDTO;
import cl.eos.dipalza.service.VendedorService;

@RestController
@RequestMapping("/api/vendedores")
public class VendedorController {

    private final VendedorService vendedorService;

    public VendedorController(VendedorService vendedorService) {
        this.vendedorService = vendedorService;
    }

    @GetMapping
    public List<VendedorDTO> listarVendedores() {
        return vendedorService.listarTodos();
    }
}
```

- [ ] **Step 8: Correr el test y verificar que pasa**

Run: `./mvnw -o -Dfrontend.skip=true -Dtest=VendedorControllerTest test`
Expected: PASS (1 test).

- [ ] **Step 9: Correr toda la suite de backend para confirmar que no hay regresiones**

Run: `./mvnw -o -Dfrontend.skip=true test`
Expected: BUILD SUCCESS, todos los tests pasan (173 tests antes de esta tarea + los 3 nuevos de este task = 176).

- [ ] **Step 10: Commit**

```bash
git add dipalza/src/main/java/cl/eos/dipalza/service/VendedorService.java \
        dipalza/src/main/java/cl/eos/dipalza/controller/VendedorController.java \
        dipalza/src/test/java/cl/eos/dipalza/service/VendedorServiceTest.java \
        dipalza/src/test/java/cl/eos/dipalza/controller/VendedorControllerTest.java
git commit -m "feat: add GET /api/vendedores endpoint returning the full vendor roster"
```

---

### Task 2: Frontend — `VendedorService` y modelo

**Repo:** `/Users/cursor/Dev/dipalza/application_v2.0/dipalza_web_client/.worktrees/lista-vendedores-mapa` (rama `feature/lista-vendedores-mapa`)

**Files:**
- Modify: `src/app/mapa/models/model.ts`
- Create: `src/app/mapa/vendedor.service.ts`
- Test: `src/app/mapa/vendedor.service.spec.ts`

**Interfaces:**
- Consumes: `GET /api/vendedores` (Task 1) devolviendo `{ codigo, tipo, rut, nombre, ciudad, comuna, direccion, telefono }[]` (el frontend solo necesita un subconjunto de esos campos).
- Produces: `VendedorDTO` interface y `VendedorService.getVendedores(): Observable<VendedorDTO[]>` — usados por `MapaComponent` en la Task 3.

- [ ] **Step 1: Agregar la interfaz `VendedorDTO` al modelo**

Agregar al final de `src/app/mapa/models/model.ts`:

```ts
export interface VendedorDTO {
  codigo: string;
  tipo: string;
  nombre: string;
}
```

- [ ] **Step 2: Escribir el test que falla**

Crear `src/app/mapa/vendedor.service.spec.ts`:

```ts
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { environment } from 'environments/environment';

import { VendedorService } from './vendedor.service';
import { VendedorDTO } from './models/model';

describe('VendedorService', () => {
  let service: VendedorService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(VendedorService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('hace GET a /vendedores y devuelve el padrón completo', () => {
    const padron: VendedorDTO[] = [
      { codigo: '001', tipo: '0', nombre: 'Juan Perez' },
      { codigo: '002', tipo: '0', nombre: 'Maria Soto' }
    ];

    service.getVendedores().subscribe((result) => {
      expect(result).toEqual(padron);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/vendedores`);
    expect(req.request.method).toBe('GET');
    req.flush(padron);
  });
});
```

- [ ] **Step 3: Correr el test y verificar que falla**

Run: `ng test --include='**/vendedor.service.spec.ts'`
Expected: FAIL — no existe el módulo `./vendedor.service`.

- [ ] **Step 4: Implementar `VendedorService`**

Crear `src/app/mapa/vendedor.service.ts`:

```ts
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { VendedorDTO } from './models/model';

@Injectable({
  providedIn: 'root'
})
export class VendedorService {
  private urlVendedores = `${environment.apiUrl}/vendedores`;

  constructor(private httpClient: HttpClient) { }

  getVendedores(): Observable<VendedorDTO[]> {
    return this.httpClient.get<VendedorDTO[]>(this.urlVendedores);
  }
}
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `ng test --include='**/vendedor.service.spec.ts'`
Expected: PASS (1 spec).

- [ ] **Step 6: Compilar**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sin errores nuevos (los únicos preexistentes son los de tipado de `ckeditor`, no relacionados).

- [ ] **Step 7: Commit**

```bash
git add src/app/mapa/models/model.ts src/app/mapa/vendedor.service.ts src/app/mapa/vendedor.service.spec.ts
git commit -m "feat: add VendedorService and VendedorDTO model for the full vendor roster"
```

---

### Task 3: Frontend — usar el padrón completo en la lista y quitar el tiempo del marker

**Repo:** `/Users/cursor/Dev/dipalza/application_v2.0/dipalza_web_client/.worktrees/lista-vendedores-mapa` (rama `feature/lista-vendedores-mapa`)

**Files:**
- Modify: `src/app/mapa/mapa.component.ts`
- Modify: `src/app/mapa/mapa.component.spec.ts`

**Interfaces:**
- Consumes: `VendedorService.getVendedores(): Observable<VendedorDTO[]>` y `VendedorDTO` (Task 2).

- [ ] **Step 1: Escribir el test que falla**

Agregar a `src/app/mapa/mapa.component.spec.ts` (después del test existente `'centrarEnVendedor no lanza error...'`), y agregar el import de `VendedorService` junto a los demás:

Reemplazar el bloque de imports del inicio del archivo:

```ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';

import { MapaComponent } from './mapa.component';
import { environment } from 'environments/environment';
```

Agregar el nuevo test al final del `describe`, antes del cierre:

```ts
  it('un vendedor del padrón sin posición reportada aparece en la lista como "Sin datos" y offline', () => {
    const httpMock = TestBed.inject(HttpTestingController);

    // La carga inicial de posiciones (GET /posicion) ya se dispara en ngAfterViewInit
    // dentro del beforeEach; la respondemos vacía para este caso.
    httpMock.expectOne(`${environment.apiUrl}/posicion`).flush([]);

    const reqVendedores = httpMock.expectOne(`${environment.apiUrl}/vendedores`);
    reqVendedores.flush([{ codigo: '001', tipo: '0', nombre: 'Juan Perez' }]);

    const lista = component.vendedores();
    expect(lista).toHaveSize(1);
    expect(lista[0].vendedorNombre).toBe('Juan Perez');
    expect(lista[0].tiempoRelativo).toBe('Sin datos');
    expect(lista[0].online).toBeFalse();
  });
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run: `ng test --include='**/mapa.component.spec.ts'`
Expected: FAIL — la petición a `${environment.apiUrl}/vendedores` nunca se dispara (`Expected one matching request... none found`), porque `MapaComponent` todavía no llama a `VendedorService`.

- [ ] **Step 3: Cargar el padrón en `MapaComponent`**

En `src/app/mapa/mapa.component.ts`, reemplazar la línea de import de `PositionsService`:

```ts
import { PositionsService } from './positions.service';
```

por:

```ts
import { PositionsService } from './positions.service';
import { VendedorService } from './vendedor.service';
```

Reemplazar la línea de import de `models/model` (agregar `VendedorDTO`):

```ts
import { HistorialPosicionDTO, PosicionDTO, VendedorListItem } from './models/model';
```

por:

```ts
import { HistorialPosicionDTO, PosicionDTO, VendedorDTO, VendedorListItem } from './models/model';
```

Agregar el campo del padrón junto a `vendedores` (después de `vendedores = signal<VendedorListItem[]>([]);`):

```ts
  private padronVendedores: VendedorDTO[] = [];
```

Agregar la inyección del servicio junto a las demás (después de `private positionService = inject(PositionsService);`):

```ts
  private vendedorService = inject(VendedorService);
```

En `ngAfterViewInit`, agregar la llamada de carga del padrón justo después de `this.loadInitialPositions();`:

```ts
    this.loadInitialPositions();
    this.cargarPadronVendedores();
```

- [ ] **Step 4: Implementar `cargarPadronVendedores` y reescribir `actualizarListaVendedores`**

Agregar el nuevo método privado, antes de `private actualizarListaVendedores(): void {`:

```ts
  private cargarPadronVendedores(): void {
    this.vendedorService.getVendedores()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((vendedores: VendedorDTO[]) => {
        this.padronVendedores = vendedores;
        this.actualizarListaVendedores();
      });
  }
```

Reemplazar el método `actualizarListaVendedores` completo:

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

por:

```ts
  private actualizarListaVendedores(): void {
    const ahora = Date.now();
    const items: VendedorListItem[] = this.padronVendedores.map((vendedor) => {
      const key = `${vendedor.codigo}_${vendedor.tipo}`;
      const posicion = this.posicionesActuales.get(vendedor.codigo);
      const online = posicion
        ? (ahora - new Date(posicion.fechaHora).getTime()) < 2 * 60 * 1000
        : false;
      return {
        vendedorId: vendedor.codigo,
        vendedorCodigo: vendedor.tipo,
        vendedorNombre: vendedor.nombre,
        color: colorForVendedor(key),
        fechaHora: posicion?.fechaHora ?? '',
        tiempoRelativo: TimeFormatter.formatRelativeTime(posicion?.fechaHora ?? ''),
        online
      };
    });
    this.vendedores.set(items);
  }
```

- [ ] **Step 5: Correr el test y verificar que pasa**

Run: `ng test --include='**/mapa.component.spec.ts'`
Expected: PASS (3 specs).

- [ ] **Step 6: Quitar el tiempo del tooltip del marcador**

En `generateLabel`, reemplazar:

```ts
  generateLabel(pos: PosicionDTO): string {
    const tiempoRelativo = TimeFormatter.formatRelativeTime(pos.fechaHora);

    const popupHtml = `
        <div class="label-minimal">
            <div class="nombre">${pos.vendedorNombre}</div>
            <div class="tiempo">${tiempoRelativo}</div>
        </div>
    `;
    return popupHtml;
  }
```

por:

```ts
  generateLabel(pos: PosicionDTO): string {
    const popupHtml = `
        <div class="label-minimal">
            <div class="nombre">${pos.vendedorNombre}</div>
        </div>
    `;
    return popupHtml;
  }
```

- [ ] **Step 7: Correr toda la suite de `mapa` y compilar**

Run: `ng test --include='**/mapa/**/*.spec.ts'`
Expected: PASS — todos los specs de `vendor-color`, `vendor-list`, `vendedor.service` y `mapa.component`.

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: sin errores nuevos.

- [ ] **Step 8: Probar visualmente**

Con el backend de la Task 1 corriendo y al menos un vendedor en el padrón que nunca haya reportado posición, entrar al mapa y verificar: ese vendedor aparece en la lista lateral con "Sin datos" y el punto offline, sin marcador en el mapa. Un vendedor que sí reporta se ve con su tiempo relativo normal. El tooltip del marcador ya no muestra la línea de tiempo, solo el nombre.

- [ ] **Step 9: Commit**

```bash
git add src/app/mapa/mapa.component.ts src/app/mapa/mapa.component.spec.ts
git commit -m "feat: build vendor list from the full roster and drop the time line from the marker tooltip"
```

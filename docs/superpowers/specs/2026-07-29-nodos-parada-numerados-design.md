# Nodos numerados de parada en el recorrido del día

## Contexto

`MapaComponent` (`src/app/mapa/mapa.component.ts`) dibuja el recorrido del día de un vendedor (`mostrarTrayectoria`, ver PR #6 recién mergeado a `main`) como una polyline completa más un `L.circleMarker` por **cada punto GPS crudo** reportado (uno cada ~30s, vía el servicio de background del móvil). El primer y último punto se distinguen con borde verde/rojo respectivamente (`esInicio`/`esFin`), y por rendimiento (potencialmente 1000+ puntos en un día completo) esos círculos usan un renderer de canvas dedicado (`private canvasRenderer = L.canvas()`).

El usuario compartió una captura de otro sistema de tracking (GPS7000) que muestra el recorrido con **marcadores numerados** en el mapa correspondientes a paradas relevantes, y una tabla debajo agrupando el recorrido por calle con hora de entrada/salida de cada tramo. Se decidió dividir esto en dos capacidades independientes: esta spec cubre solo la numeración de paradas en el mapa; la tabla por calle (que requiere geocodificación inversa, capacidad que hoy no existe en el proyecto) queda para un spec posterior.

## Objetivo

1. En vez de un punto por cada posición GPS cruda, mostrar solo los puntos donde el vendedor permaneció **más de 10 minutos** en un radio de ~100 metros ("paradas"), numerados en orden cronológico.
2. El primer punto del día y el último siempre generan un nodo numerado (1 y N respectivamente), aunque no cumplan el umbral de 10 minutos — para no perder la referencia visual de inicio/fin del recorrido.
3. La polyline completa (con todos los puntos crudos) no cambia.
4. La numeración es independiente por vendedor: si hay varias trayectorias visibles a la vez (selección múltiple ya soportada), cada una numera desde 1.
5. El algoritmo de detección de paradas debe quedar aislado como función pura, sin dependencias de Angular ni Leaflet, para poder reutilizarlo en el futuro spec de la tabla por calle y para poder testearlo sin montar el mapa.

## Enfoque

### Algoritmo de detección de paradas (`detectar-paradas.ts`, nuevo archivo)

Función pura `detectarParadas(puntos: HistorialPosicionDTO[], radioMetros = 100, duracionMinimaMs = 10 * 60 * 1000): NodoParada[]`, donde:

```typescript
interface NodoParada {
  numero: number;
  latitud: number;
  longitud: number;
  comienzo: string;   // fechaHora del primer punto del grupo
  fin: string;         // fechaHora del último punto del grupo
  esInicio: boolean;
  esFin: boolean;
}
```

Algoritmo (asume `puntos` ya viene ordenado cronológicamente, como lo entrega el backend):

1. Agrupa los puntos consecutivos: un punto se suma al grupo abierto si su distancia al punto de referencia del grupo (el primero del grupo) es ≤ `radioMetros`; si no, se cierra el grupo actual y se abre uno nuevo con ese punto. La distancia se calcula con `L.latLng(a).distanceTo(L.latLng(b))` (Leaflet ya expone esto — no se reimplementa Haversine a mano).
2. Un grupo se conserva como "parada" solo si `fechaHora` del último punto menos `fechaHora` del primero es ≥ `duracionMinimaMs`. Los grupos que no cumplen se descartan (son tránsito, no parada). La posición (`latitud`/`longitud`) de un nodo de parada es el **centroide** (promedio simple de lat y de lng) de todos los puntos del grupo, no el primer punto — da una ubicación más representativa cuando el GPS tiene ruido dentro del radio de tolerancia.
3. El primer punto de `puntos` y el último **siempre** producen un nodo, aun si su grupo no calificó como parada — si el grupo del primer/último punto ya calificó como parada, es el mismo nodo (no se duplica, y su posición sigue siendo el centroide del punto 2); si no calificó, se agrega un nodo adicional usando ese único punto tal cual (`comienzo === fin`, posición = ese punto exacto, no hay centroide que calcular).
4. Los nodos resultantes (paradas reales + inicio/fin forzados) se ordenan cronológicamente por `comienzo` y se numeran 1..N. `esInicio` es `true` solo para el nodo cuyo `comienzo` coincide con el primer punto de `puntos`; `esFin` solo para el que coincide con el último.
5. Caso borde: si `puntos` tiene un solo elemento, se devuelve un único nodo con `esInicio: true, esFin: true, comienzo === fin`.

### Cambios en `mostrarTrayectoria` (`mapa.component.ts`)

- La polyline (líneas 262-269 actuales) no cambia.
- El bucle actual que crea un `circleMarker` por cada punto (líneas 271-290) se reemplaza por: `const nodos = detectarParadas(puntos);` seguido de un bucle sobre `nodos` (típicamente unos pocos por día, no cientos) que crea un marcador por nodo:
  - Se usa `L.marker` con un `L.divIcon` numerado (badge circular con el número en texto blanco), no `circleMarker` — ya no se necesita el truco de canvas renderer porque el volumen de marcadores baja de cientos/miles a un puñado de paradas reales por día. Estilo de color: verde (`#2ecc71`) si `esInicio`, rojo (`#e74c3c`) si `esFin`, color del vendedor (`colorForVendedor(key)`) en el resto — mismo esquema de color que ya existe hoy, solo que ahora aplicado a un ícono con número en vez de al borde de un círculo.
  - Popup por nodo: si es una parada real (no forzada por ser solo inicio/fin sin cumplir el umbral) y `comienzo !== fin`, `"Parada {numero} — {horaComienzo} a {horaFin}"`. Si es el nodo forzado de inicio (`esInicio` y `comienzo === fin`), se mantiene el texto actual `"Inicio — {hora}"`; análogo para `esFin` con `"Última posición — {hora}"`. Si el nodo es simultáneamente parada real y inicio/fin (el vendedor se quedó parado más de 10 min justo al empezar o terminar el día), el texto de parada tiene prioridad sobre el de inicio/fin, ya que es más informativo (incluye la duración).
- Se elimina el campo `private canvasRenderer = L.canvas()` (línea 39) y su uso en las opciones del `circleMarker` (línea 279) — deja de ser necesario al bajar drásticamente el número de marcadores dibujados por trayectoria.

### Qué NO cambia

- `toggleTrayectoria`, `ajustarVistaATrayectoriasVisibles`, el manejo de errores/toast, la lista de vendedores con checkboxes, y todo el resto del flujo de selección múltiple del PR #6 — nada de eso se toca.
- El backend no cambia: sigue devolviendo los mismos puntos crudos vía `POST /api/posicion/historico`; la agrupación en paradas ocurre enteramente en el cliente.

## Fuera de alcance

- La tabla de tramos por calle con geocodificación inversa (spec futura y separada).
- Ajustar el radio (100m) o la duración mínima (10 min) mediante configuración de usuario — quedan como constantes con default, sin UI para cambiarlas.
- Persistir o cachear el resultado de `detectarParadas` entre sesiones — se recalcula cada vez que se pide el histórico.

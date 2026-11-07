# Reporte de ubicaciones en PDF — Diseño

Fecha: 2026-11-06
Repos: `dipalza_web_client` (principal), `dipalza_server` (ajuste menor)

## Intención

Desde la vista del mapa de la app web, el usuario necesita extraer un **respaldo operativo** de las ubicaciones de los vendedores: un documento que deje constancia de por dónde anduvo cada vendedor y dónde se detuvo.

El uso normal es **un día**, para **un vendedor o para todos**. El rango máximo es de **un mes**.

## Objetivos

- Desde la vista del mapa, elegir un rango de fechas y uno o varios vendedores, y descargar **un único PDF** que los incluya a todos.
- Por cada vendedor y por cada día con datos:
  - un **mapa** con el recorrido completo dibujado con **todas** las posiciones GPS de ese día;
  - la **lista de paradas** detectadas ese día.
- Que sea fácil cruzar el mapa con la tabla: las paradas van numeradas igual en ambos.

## No objetivos

- No es un listado de puntos GPS: la tabla muestra solo paradas, nunca las posiciones crudas.
- No se asocia la parada a un cliente. El dato no existe hoy; solo está la calle.
- No genera un archivo por vendedor ni un ZIP. Esto se descartó explícitamente.
- No hay generación programada ni envío por correo.
- No cambia la detección de paradas (100 m / 10 min).

## Anti-objetivos (sería un fracaso aunque "funcione")

- Que el mapa del PDF no muestre el recorrido completo: por ejemplo, que se simplifique la línea quitando puntos.
- Que generar el caso normal (un día, todos los vendedores) sea lento o frágil.
- Descargar en masa los mosaicos de OpenStreetMap desde el servidor. Va contra su política de uso.
- Geocodificar en vivo durante la generación. Nominatim admite una consulta cada 1,1 s, y un mes se volvería inviable.

## Contexto existente (relevado)

### dipalza_web_client — `src/app/mapa/`

- **Mapa:** Leaflet 1.9.4 con mosaicos `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` (`mapa.config.ts:5`). Lo inicializa `map-initializer.service.ts`.
- **Componente:** `mapa.component.ts`. Hoy se trabaja con un vendedor y un día a la vez.
  - El panel flotante es `vendor-list/`.
  - El historial de los últimos 30 días está en `historial-panel/`.
  - Las paradas se muestran en `tramos-table/`.
- **Dibujo actual** (`mostrarTrayectoria`):
  - polilínea de ancho 5 con el color de `colorForVendedor()` (`vendor-color.ts`);
  - marcadores `divIcon` numerados, verde para el inicio y rojo para el fin;
  - `fitBounds` al final.
- **Servicios:**
  - `positions.service.ts` → `POST /posicion/historico` con `PositionFilter {vendedorIds:[{codigo,tipo}], desde?, hasta?, dia?}`;
  - `vendedor.service.ts` → `GET /vendedores`. La vista se queda con los de `tipo === '0'`.
- **No hay librería de PDF ni de captura.** Solo `xlsx`.

### dipalza_server

- `POST /api/posicion/historico` (`PosicionController`, `PosicionService.buscarHistorico`, `HistorialPosicionSpecifications`):
  - acepta varios vendedores y un rango `desde`/`hasta`, ordenado por `fechaHora`;
  - **no tiene límite de rango ni paginación**, y sin filtros devuelve la tabla completa.
- `POST /api/deteccion/historico` (`DeteccionController`, `DeteccionService`):
  - recibe el mismo `PositionFilter`, filtrado por `horaInicio`;
  - devuelve `ParadaVendedorDTO(id, vendedorId, vendedorCodigo, vendedorNombre, latitud, longitud, calle, horaInicio, horaFin, enCurso)`;
  - las paradas se detectan en tiempo real con 100 m / 10 min y la `calle` ya está persistida;
  - la web no usa este endpoint hoy.
- Ya hay PDF en el servidor con OpenPDF (`service/report/HojaRutaPdfGenerator.java`), pero no sirve para mapas.

### Volumen

- La app móvil envía una posición cada 30 s, también con el equipo detenido. Si un envío falla, la posición se reencola, así que pueden llegar **fuera de orden**.
- Son unos 1.000 a 1.400 puntos por vendedor y día, y unos 30.000 a 40.000 por vendedor al mes.

## Decisiones

### Tomadas por el usuario

1. Se accede **desde la vista del mapa** de la app web.
2. El usuario **elige qué vendedores** entran en el reporte.
3. El rango es **de hasta un mes**. Lo normal es un día con un vendedor o con todos.
4. El mapa dibuja el recorrido con **todas** las posiciones.
5. La lista contiene **solo las paradas**.
6. Se genera **un único PDF** con todos los vendedores seleccionados.
7. **Las paradas salen de las persistidas en el servidor** (`deteccion/historico`). Los datos que existen hoy en la BD son de prueba. Se asume que desde ahora siempre habrá paradas persistidas correctas, por lo que:
   - **No** se recalculan paradas de días pasados.
   - **No** se recurre a `detectar-paradas.ts` como respaldo.
   - Se acepta que, en casos puntuales, la lista del PDF difiera de la que la vista calcula en el navegador. Por ejemplo, cuando el servidor recibe posiciones reencoladas fuera de orden. Esta diferencia es conocida y no se corrige en este trabajo.

### Del diseñador (Claude) — revisables

- **El PDF se genera en el navegador**, no en el servidor.
  - Motivo: un mapa con calles exige mosaicos; generarlos en el servidor sería descarga masiva de OSM.
  - En el navegador se reutiliza Leaflet con la misma capa y estilo que la vista.
  - Costo: el usuario espera con la pestaña abierta.
- **Las paradas se toman de `POST /api/deteccion/historico`** (persistidas, con la calle resuelta). No se recalculan con `detectar-paradas.ts` ni se geocodifica en vivo.
- **Si una parada no tiene calle** (la geocodificación asíncrona falló o sigue pendiente), se muestra "—" junto a las coordenadas. No se reintenta durante la generación.
- **Si una parada sigue en curso** (`enCurso = true`), la hora de salida se muestra como "en curso" y la duración se calcula hasta la hora de generación, con la marca "(en curso)".
- **Un día** es el día calendario en hora de Chile, igual que la vista actual. Una parada pertenece al día de su `horaInicio`.
- **Tope de 31 días por consulta en el servidor** para `posicion/historico` y `deteccion/historico`. Además, se rechaza la consulta sin filtro de fecha (respuesta 400). La validación también existe en el cliente.

## Experiencia de usuario

### Entrada

En la vista del mapa se agrega el botón **"Reporte de ubicaciones"**, visible en el panel flotante o en la barra de herramientas del mapa. Abre un **diálogo** con:

- **Fechas:**
  - por defecto, **hoy** como día único;
  - se puede pasar a un rango desde/hasta, de 31 días como máximo;
  - si el rango supera 31 días, o la fecha "hasta" es anterior a "desde", se ve un error y el botón queda deshabilitado.
- **Vendedores:**
  - la misma lista que usa la vista (`tipo === '0'`), con casillas;
  - **"Seleccionar todos"** / "Quitar todos";
  - al menos uno es obligatorio.
- **Aviso de volumen:**
  - si vendedores × días supera unas **100 páginas de mapa** (estimación previa), aparece un aviso de que la generación puede tardar varios minutos y el archivo será pesado;
  - no se bloquea.
- El botón **"Generar PDF"**.

### Durante la generación

- Se ve una barra de progreso con texto, por ejemplo: "Vendedor 3 de 12 — día 2 de 5".
- Hay un botón **Cancelar**, que aborta y no descarga nada.
- Si falla la carga de datos de un vendedor, se aborta con un mensaje claro. **No** se descarga un PDF incompleto en silencio.

### Resultado

- Se descarga un PDF llamado `reporte-ubicaciones_<desde>_<hasta>.pdf`, o `reporte-ubicaciones_<fecha>.pdf` si es un día único.

## Contenido del PDF

### Portada / índice

- Título "Reporte de ubicaciones".
- Rango de fechas, fecha y hora de generación, y usuario que lo generó si está disponible en la sesión.
- Índice con una fila por vendedor: nombre, código, días con datos, total de paradas y página de inicio.
- Un vendedor sin registros en el rango aparece con la leyenda **"sin registros"** y no tiene páginas propias.

### Sección por vendedor

- Orden de los vendedores: por nombre.
- Cabecera con nombre, código y resumen del rango (días con datos y total de paradas). Puede ir sobre la primera página del vendedor, sin ocupar una página aparte.
- **Una página por día con datos**, en orden cronológico:
  - Encabezado: fecha (por ejemplo "jueves 6 de noviembre de 2026"), hora de la primera y la última posición, y cantidad de posiciones.
  - **Mapa:**
    - ocupa la mitad superior o un poco más de la página;
    - tiene la misma capa OSM que la vista;
    - la polilínea pasa por todas las posiciones del día, ordenadas por `fechaHora` (el orden de llegada no sirve);
    - el color es el del vendedor (`colorForVendedor`);
    - marcador verde de inicio, rojo de fin, y marcadores numerados para las paradas con los mismos números que la tabla;
    - el encuadre es `fitBounds` del recorrido con margen;
    - lleva la atribución "© OpenStreetMap contributors" visible, como exige la licencia.
  - **Tabla de paradas:**
    - columnas: N°, Calle, Llegada, Salida y Duración (hh:mm);
    - si no cabe, continúa en la página siguiente y repite el encabezado;
    - un día con posiciones pero sin paradas muestra el mapa y la leyenda "sin paradas detectadas".
- Pie de cada página: vendedor, fecha del día, "Página N de M".

## Datos y flujo

1. **Validar** el formulario: el rango es de 31 días como máximo y hay al menos un vendedor.
2. **Por cada vendedor, de a uno** (para acotar la memoria):
   - Pedir las posiciones del rango a `POST /posicion/historico` con `desde`/`hasta`.
   - Pedir las paradas del rango a `POST /deteccion/historico`.
   - Agrupar ambas por día y ordenar las posiciones por `fechaHora`.
   - Por cada día, renderizar el mapa en un contenedor fuera de pantalla de tamaño fijo, esperar a que carguen los mosaicos, capturarlo como imagen y agregar la página con la tabla.
   - Liberar los datos y el mapa antes de pasar al vendedor siguiente.
3. **Al final**, completar el índice de la portada con las páginas de inicio y los totales, y descargar el archivo.

El índice necesita los números de página. Una opción es reservar la portada y escribirla al final. Otra es hacer una primera pasada solo de datos para contar días y paradas. Decide el implementador.

## Restricciones

- Angular 20 con signals, siguiendo el estilo de los componentes existentes de `mapa/`.
- Nombres y textos en español.
- Los mosaicos de OSM se piden desde el navegador, con el mismo volumen que mirar el mapa: unos pocos mosaicos por día de reporte y sin prefetch agresivo. Para capturarlos en un canvas se necesita CORS (`crossOrigin`); OSM lo permite.
- No cambia el comportamiento actual de la vista del mapa (selección, historial, tiempo real).
- Servidor: el tope de 31 días no debe romper los usos actuales de la web. Hoy la web consulta por `dia`.
  - Ya se verificó (2026-11-06) que solo la web consume `posicion/historico` y `deteccion/historico`, siempre con `dia`. La app móvil no los usa, así que el tope de 31 días no rompe a otros consumidores.
- Título de cada PR con prefijo `feat:` / `fix:`, porque semantic-release lo exige.

## Queda en manos del implementador

- **Librerías:**
  - Para el PDF se sugiere `jspdf`, más `jspdf-autotable` para la tabla.
  - Para capturar el mapa se sugiere `leaflet-image` o `html-to-image`, o componer los mosaicos en un canvas a mano.
  - Se elige la que capture de forma fiable mosaicos, polilínea y marcadores `divIcon`. Los `divIcon` son HTML: hay que verificar que salgan en la captura o dibujarlos como `circleMarker` con etiqueta en el canvas.
- Tamaño del contenedor del mapa y resolución de la captura: legible al imprimir en A4, cuidando el peso del archivo (JPEG con calidad moderada).
- Ubicación exacta del botón en la vista.
- Tests unitarios con la estructura de los existentes: agrupación por día, cálculo de duración, validación de rango y armado del índice.

## Cómo se verifica

- Caso normal: un día con todos los vendedores. El PDF trae el índice correcto, una página por vendedor con datos, el mapa con el recorrido completo, las paradas numeradas que coinciden con la tabla y la atribución OSM.
- Un vendedor y 31 días: genera sin errores, con páginas solo para los días con datos.
- Un vendedor sin datos aparece como "sin registros" en el índice.
- Con un rango de 32 días: el cliente lo bloquea y el servidor responde 400.
- Cancelar a mitad de la generación no descarga nada.
- **Datos de prueba:**
  - Los recorridos sembrados hoy en la BD se insertaron directo en `historial_posicion`, así que **no tienen paradas persistidas**.
  - Para verificar la tabla de paradas, hay que generar recorridos que pasen por `POST /api/posicion`, en orden cronológico, para que la detección del servidor los procese. Puede ser con el simulador de navegación de `dipalza_server` o con un script.
  - Imprimir una página en A4 para revisar que se lea.

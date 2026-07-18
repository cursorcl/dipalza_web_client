# Resumen de Venta (totales de ventas pendientes de facturar)

## Contexto

El menú lateral "Ventas" ya tiene opciones para ver el listado de ventas pendientes de facturar ("Ventas por Facturar", ruta `/ventas`, filtro `estados: ['FINISHED']`), ventas en curso y ventas facturadas. No existe una vista que muestre los totales agregados de las ventas pendientes de facturar (cantidad y montos), que es lo que se necesita ahora.

En el modelo de datos, el estado `FINISHED` de una `Venta` significa "el vendedor confirmó la venta, queda lista para ser facturada" (aún no facturada); `CLOSED` es el estado de una venta ya facturada. Por lo tanto "ventas hasta el momento sin facturar" corresponde al filtro `estados: ['FINISHED']`, el mismo que usa hoy "Ventas por Facturar".

## Objetivo

Agregar una nueva opción "Resumen de Venta" al menú lateral, dentro del grupo "Ventas", que muestre en una sola pantalla los totales agregados de las ventas pendientes de facturar:

- Cantidad de ventas
- Total Neto
- Total Descuentos
- Total IVA
- Total ILA
- Total Bruto

## Enfoque

Reutilizar el endpoint y el método existente `VentasService.obtainSales({ estados: ['FINISHED'] })` (el mismo que usa `ListadoVentasDiaComponent` para "Ventas por Facturar") y calcular los totales en el frontend, sumando los campos que cada `Venta` ya trae: `totalNeto`, `totalDescuento`, `totalIva`, `totalIla`, `total` (este último es el total bruto).

No se requieren cambios en el backend ni en `VentasService`: la lógica de agregación vive enteramente en el nuevo componente.

Se descartó agregar un endpoint de agregación en el backend (SQL `SUM`/`COUNT`) por ahora: el volumen de ventas pendientes de facturar es acotado, y sumar en el cliente reutiliza exactamente el mismo patrón que ya existe en `ListadoVentasDiaComponent`. Si el volumen de datos creciera lo suficiente como para que traer todas las ventas al cliente sea un problema de rendimiento, se puede migrar a un endpoint agregado más adelante sin cambiar la UI.

## Diseño

### Ruta y menú

- Nueva ruta `ventas/resumen` en [ventas.routes.ts](../../../src/app/ventas/ventas.routes.ts), que carga el nuevo componente standalone `ResumenVentasComponent` vía `loadComponent`.
- Nueva entrada en [routes.json](../../../src/assets/data/routes.json), dentro del grupo "Ventas", con `title: "Resumen de Venta"`, ubicada inmediatamente después de "Ventas por Facturar".

### Componente `ResumenVentasComponent`

Ubicación: `src/app/ventas/resumen-ventas/` (`.component.ts`, `.component.html`, `.component.scss`), standalone, siguiendo el mismo patrón de los demás componentes de `ventas/`.

- En `ngOnInit`, llama `ventasService.obtainSales({ estados: ['FINISHED'] })`.
- Mientras la petición está en curso, expone `loadingIndicator = true` (igual que en `ListadoVentasDiaComponent` / `ListadoResultadosFacturacionDiaComponent`).
- Al recibir la respuesta (`Venta[]`), calcula y expone en propiedades del componente:
  - `cantidadVentas = ventas.length`
  - `totalNeto = suma de venta.totalNeto`
  - `totalDescuento = suma de venta.totalDescuento`
  - `totalIva = suma de venta.totalIva`
  - `totalIla = suma de venta.totalIla`
  - `totalBruto = suma de venta.total`
- Si la petición falla (`HttpErrorResponse`), registra el error en consola (mismo patrón que el resto del módulo) y muestra un mensaje de error simple en la plantilla en lugar de las tarjetas.

No se agrega ninguna acción (no hay botón de facturar ni edición): es una vista de solo lectura, complementaria a "Ventas por Facturar".

### Plantilla

- Breadcrumb con el mismo estilo que el resto de las páginas de `ventas/` (título de página + enlace a inicio + enlace a `/ventas`).
- Seis tarjetas de resumen (`card` / `card-body`), con el mismo estilo visual que las stat-cards existentes en `dashboard2.component.html` (título corto + valor grande + ícono), una por cada total. Los cinco totales monetarios usan el pipe `currency`; la cantidad de ventas se muestra como número simple.
- Mientras `loadingIndicator` es `true`, se muestra un indicador de carga simple en vez de las tarjetas.

## Fuera de alcance

- No se modifica el backend (Spring Boot) ni se agrega ningún endpoint nuevo.
- No se agregan filtros de fecha, cliente, vendedor ni ruta en esta vista: siempre muestra el total de todas las ventas en estado `FINISHED`.
- No se agrega la posibilidad de facturar desde esta pantalla.
- No se persiste ni cachea el resultado: cada vez que se entra a la página se vuelve a consultar el backend.

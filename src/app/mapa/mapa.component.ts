import { AfterViewInit, Component, DestroyRef, ElementRef, inject, OnDestroy, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { MapInitializerService } from './map-initializer.service';
import { HistorialPosicionDTO, PosicionDTO } from './models/model';
import { Subscription } from 'rxjs';
import { WSPositionService } from './ws-position.service';
import { PositionsService } from './positions.service';
import { TimeFormatter } from 'app/utils/time-formatter';
import { generateColorPellete } from 'app/utils/color-pallet';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-mapa',
  imports: [],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.scss'
})
export class MapaComponent implements AfterViewInit, OnDestroy {

  private subscription: Subscription = new Subscription();
  private posicionesActuales: Map<string, PosicionDTO> = new Map();
  private colors: Map<string, string> = new Map(); // Mapa para asignar colores únicos a cada vendedor
  private colorPellete: string[] = generateColorPellete(20); // Generamos una paleta de colores para hasta 20 vendedores
  private colorIndex: number = 0; // Índice para asignar colores de la paleta

  @ViewChild('map', { static: true }) mapEl!: ElementRef<HTMLDivElement>;
  private map!: L.Map;
  private markers: Map<string, L.Marker> = new Map();
  private historialLayer: L.LayerGroup = L.layerGroup();

  private mapInit = inject(MapInitializerService);
  private wsPosicionService = inject(WSPositionService);
  private positionService = inject(PositionsService);
  private destroyRef = inject(DestroyRef);


  ngAfterViewInit(): void {
    this.map = this.mapInit.createMap(this.mapEl.nativeElement);
    this.map.addLayer(this.historialLayer);
    this.loadInitialPositions();
    this.subscription = this.wsPosicionService.getPositions$().subscribe(
      (posicion: PosicionDTO) => {
        this.updatePositionOnMap(posicion);
      }
    );
    setInterval(() => {
      this.markers.forEach((marker, key) => {
        const data = this.posicionesActuales.get(key);
        if (data) {
          this.updateTooltips(marker, data);
        }
      });
    }, 30000);

  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.wsPosicionService.disconnect();
  }

  private updatePositionOnMap(data: PosicionDTO): void {
    const { vendedorId, vendedorCodigo, latitud, longitud } = data;
    const newLatLng = L.latLng(latitud, longitud);


    let marker = this.markers.get(vendedorId);
    if (this.markers.has(vendedorId)) {
      marker?.setLatLng(newLatLng);
    } else {
      const key = `${vendedorId}_${vendedorCodigo}`;
      const markerColor = this.getColorForVendedor(key);
      // Si es un vendedor nuevo, creamos el marcador y lo añadimos al mapa y al caché
      const label = this.generateLabel(data);
      marker = L.marker(newLatLng)
        .addTo(this.map);

      marker.on('click', () => {
        this.consultarYDibujarTrayectoriaDia(vendedorId, vendedorCodigo);
      });

      marker.bindTooltip(
        label, {
        permanent: true,     // <--- Crucial: no se cierra
        direction: 'top',    // Aparece arriba del icono
        className: 'tooltip-vendedor-clean', // Para CSS personalizado
        offset: [-15, 10], // Ajuste fino para centrar el tooltip sobre el icono
        opacity: 0.9
      });
      marker.setIcon(this.createCustomIcon(markerColor)); // Asignamos el icono personalizado con el color específico
      this.markers.set(vendedorId, marker);
    }
    if (marker) {
      this.updateTooltips(marker, data);
    }

  }
  getColorForVendedor(key: string): string {

    const markerColor = this.colors.get(key) || this.colorPellete[this.colorIndex];
    this.colors.set(key, markerColor);
    this.colorIndex = (this.colorIndex + 1) % this.colorPellete.length; // Avanzamos al siguiente color de la paleta
    return markerColor;
  }


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

  updateTooltips(marker: L.Marker, pos: PosicionDTO) {

    const popupHtml = this.generateLabel(pos);
    marker.setTooltipContent(popupHtml);
  }

  private loadInitialPositions(): void {
    this.positionService.getActualPositions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((posiciones: PosicionDTO[]) => {
        posiciones.forEach(posicion => {
          this.updatePositionOnMap(posicion)
        });

        const bounds = this.getBoundarys();
        if (bounds.isValid()) {
          this.map.fitBounds(bounds);
        }
      });
  }

  private getBoundarys(): L.LatLngBounds {
    const bounds = L.latLngBounds([]);
    this.markers.forEach(marker => {
      bounds.extend(marker.getLatLng());
    });
    return bounds;
  }

  createCustomIcon(color: string): L.DivIcon {
    // Definimos un SVG de tipo "pin" o "gota"
    const svgTemplate = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <path fill="${color}" stroke="#FFFFFF" stroke-width="1" 
        d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-12-7z"/>
      <circle fill="#FFFFFF" cx="12" cy="9" r="4"/>
    </svg>
  `;

    return L.divIcon({
      html: svgTemplate,
      className: 'custom-vendedor-icon', // Clase para quitar estilos por defecto de Leaflet
      iconSize: [32, 32],
      iconAnchor: [16, 32], // El punto de anclaje es la base del pin
      popupAnchor: [0, -32],
      tooltipAnchor: [16, -32] // Alineación para que el tooltip flote sobre el pin
    });
  }

  showHistory(points: HistorialPosicionDTO[]) {
    // Limpiamos la capa antes de presentar una nueva consulta
    this.historialLayer.clearLayers();

    // Agrupamos por vendedorId + vendedorCodigo (Clave compuesta corregida)
    const trayectorias = this.groupBySeller(points);

    trayectorias.forEach((coordinates, key) => {
      const color = this.getColorForVendedor(key);

      // Creamos la polilínea con el estilo "Clean"
      const linea = L.polyline(coordinates, {
        color: color,
        weight: 3,
        opacity: 0.7,
        smoothFactor: 1.5
      });

      // Añadimos la línea al grupo, no directamente al mapa
      linea.addTo(this.historialLayer);
    });
  }

  private groupBySeller(points: HistorialPosicionDTO[]): Map<string, L.LatLngExpression[]> {
    const groupedPoints = new Map<string, L.LatLngExpression[]>();

    points.forEach(point => {
      // Generamos la clave única basada en tu modelo de clave compuesta
      const key = `${point.vendedorId}_${point.vendedorCodigo}`;

      if (!groupedPoints.has(key)) {
        groupedPoints.set(key, []);
      }

      // Añadimos el punto a la lista del vendedor correspondiente
      groupedPoints.get(key)!.push([point.latitud, point.longitud]);
    });

    return groupedPoints;
  }

  private consultarYDibujarTrayectoriaDia(codigo: string, tipo: string) {
    const hoy = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

    const filter = {
      vendedorIds: [{ codigo: codigo, tipo: tipo }],
      dia: hoy
    }
    // Llamada al servicio que utiliza el repositorio con fetch
    this.positionService.getHistoric(filter)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(puntos => {
        if (puntos.length > 0) {
          this.historialLayer.clearLayers(); // Limpiamos trayectorias anteriores

          const coordenadas = puntos.map(p => [p.latitud, p.longitud]);
          const key = `${codigo}_${tipo}`;
          const color = this.getColorForVendedor(key);

          const polyline = L.polyline(coordenadas as L.LatLngExpression[], {
            color: color,
            weight: 5,
            opacity: 0.8,
            smoothFactor: 1
          });

          // Para el historial, usamos el Popup según lo solicitado
          polyline.bindPopup(`<b>Historial de hoy:</b> ${puntos[0].vendedorNombre}`);
          polyline.addTo(this.historialLayer);

          // Ajustamos la vista para ver el recorrido completo
          this.map.fitBounds(polyline.getBounds(), { padding: [50, 50] });
        }
      });
  }
}

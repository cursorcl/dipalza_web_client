import { AfterViewInit, Component, DestroyRef, ElementRef, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import * as L from 'leaflet';
import { MapInitializerService } from './map-initializer.service';
import { HistorialPosicionDTO, PosicionDTO, PositionFilter, VendedorDTO, VendedorId, VendedorListItem } from './models/model';
import { Subscription, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { WSPositionService } from './ws-position.service';
import { PositionsService } from './positions.service';
import { VendedorService } from './vendedor.service';
import { TimeFormatter } from 'app/utils/time-formatter';
import { colorForVendedor } from './vendor-color';
import { detectarParadas, NodoParada } from './detectar-paradas';
import { VendorListComponent } from './vendor-list/vendor-list.component';
import { TramosTableComponent } from './tramos-table/tramos-table.component';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-mapa',
  imports: [VendorListComponent, TramosTableComponent],
  templateUrl: './mapa.component.html',
  styleUrl: './mapa.component.scss'
})
export class MapaComponent implements AfterViewInit, OnDestroy {

  private subscription: Subscription = new Subscription();
  private posicionesActuales: Map<string, PosicionDTO> = new Map();

  @ViewChild('map', { static: true }) mapEl!: ElementRef<HTMLDivElement>;
  private map!: L.Map;
  private markers: Map<string, L.Marker> = new Map();
  private historialLayer: L.LayerGroup = L.layerGroup();
  private tooltipRefreshInterval?: ReturnType<typeof setInterval>;
  vendedores = signal<VendedorListItem[]>([]);
  private padronVendedores: VendedorDTO[] = [];

  toastMensaje = signal<string | null>(null);
  private toastTimeout?: ReturnType<typeof setTimeout>;

  private marcadorResaltado?: L.Marker;
  private resaltadoTimeout?: ReturnType<typeof setTimeout>;

  private trayectoriasPorVendedor: Map<string, L.LayerGroup> = new Map();
  private cargando: Set<string> = new Set();
  private desiredSelection: string | null = null; // Tracks the most recently desired selection while loads are in flight
  seleccionado = signal<string | null>(null);
  nodosSeleccionados = signal<NodoParada[]>([]);

  private mapInit = inject(MapInitializerService);
  private wsPosicionService = inject(WSPositionService);
  private positionService = inject(PositionsService);
  private vendedorService = inject(VendedorService);
  private destroyRef = inject(DestroyRef);


  ngAfterViewInit(): void {
    this.map = this.mapInit.createMap(this.mapEl.nativeElement);
    this.map.addLayer(this.historialLayer);
    this.loadInitialPositions();
    this.cargarPadronVendedores();
    this.wsPosicionService.connect();
    this.subscription = this.wsPosicionService.getPositions$().subscribe(
      (posicion: PosicionDTO) => {
        this.updatePositionOnMap(posicion);
      }
    );
    this.tooltipRefreshInterval = setInterval(() => {
      this.markers.forEach((marker, key) => {
        const data = this.posicionesActuales.get(key);
        if (data) {
          this.updateTooltips(marker, data);
        }
      });
      this.actualizarListaVendedores();
    }, 1000);

  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.tooltipRefreshInterval) {
      clearInterval(this.tooltipRefreshInterval);
    }
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    if (this.resaltadoTimeout) {
      clearTimeout(this.resaltadoTimeout);
    }
    // No desconectamos el WebSocket acá: WSPositionService es un singleton
    // root, se mantiene conectado durante toda la sesión de la app en vez
    // de reconectarse cada vez que se entra a esta página.
  }

  private updatePositionOnMap(data: PosicionDTO): void {
    const { vendedorId, vendedorCodigo, latitud, longitud } = data;
    const newLatLng = L.latLng(latitud, longitud);
    this.posicionesActuales.set(vendedorId, data);

    let marker = this.markers.get(vendedorId);
    if (this.markers.has(vendedorId)) {
      marker?.setLatLng(newLatLng);
    } else {
      const key = `${vendedorId}_${vendedorCodigo}`;
      const markerColor = colorForVendedor(key);
      // Si es un vendedor nuevo, creamos el marcador y lo añadimos al mapa y al caché
      const label = this.generateLabel(data);
      marker = L.marker(newLatLng)
        .addTo(this.map);

      marker.on('click', () => {
        this.toggleTrayectoria({ codigo: vendedorId, tipo: vendedorCodigo, nombre: data.vendedorNombre });
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
    this.actualizarListaVendedores();

  }
  generateLabel(pos: PosicionDTO): string {
    const popupHtml = `
        <div class="label-minimal">
            <div class="nombre">${pos.vendedorNombre}</div>
        </div>
    `;
    return popupHtml;
  }

  updateTooltips(marker: L.Marker, pos: PosicionDTO) {

    const popupHtml = this.generateLabel(pos);
    marker.setTooltipContent(popupHtml);
  }

  private cargarPadronVendedores(): void {
    this.vendedorService.getVendedores()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((err) => {
          console.error('Error cargando el padrón de vendedores', err);
          return of([] as VendedorDTO[]);
        })
      )
      .subscribe((vendedores: VendedorDTO[]) => {
        this.padronVendedores = vendedores.filter(v => v.tipo === '0');
        this.actualizarListaVendedores();
      });
  }

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

  centrarEnVendedor(vendedorId: string): void {
    const marker = this.markers.get(vendedorId);
    if (marker) {
      this.map.setView(marker.getLatLng(), this.map.getZoom());
    }
  }

  centrarEnNodoDelMapa(punto: { latitud: number; longitud: number }): void {
    this.map.setView([punto.latitud, punto.longitud], this.map.getZoom());
    this.resaltarPunto(punto);
  }

  private resaltarPunto(punto: { latitud: number; longitud: number }): void {
    if (this.marcadorResaltado) {
      this.map.removeLayer(this.marcadorResaltado);
    }
    if (this.resaltadoTimeout) {
      clearTimeout(this.resaltadoTimeout);
    }

    this.marcadorResaltado = L.marker([punto.latitud, punto.longitud], {
      icon: L.divIcon({
        html: '<div class="resaltado-punto-pulso"></div>',
        className: 'custom-resaltado-punto-icon',
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      }),
      interactive: false
    }).addTo(this.map);

    this.resaltadoTimeout = setTimeout(() => {
      if (this.marcadorResaltado) {
        this.map.removeLayer(this.marcadorResaltado);
        this.marcadorResaltado = undefined;
      }
    }, 1500);
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

  toggleTrayectoria(vendedor: VendedorId & { nombre: string }): void {
    const key = `${vendedor.codigo}_${vendedor.tipo}`;

    if (key === this.seleccionado()) {
      this.ocultarTrayectoria(key);
      this.seleccionado.set(null);
      this.desiredSelection = null;
      return;
    }

    if (this.cargando.has(key)) {
      this.desiredSelection = key;
      return;
    }

    // Hide any currently displayed trajectory (whether in-flight or completed)
    const anterior = this.seleccionado();
    if (anterior !== null) {
      this.ocultarTrayectoria(anterior);
      this.seleccionado.set(null);
    }

    // Track that this key is the currently desired selection
    this.desiredSelection = key;

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
          // Only display if this response is still the desired selection
          if (key !== this.desiredSelection) {
            return;
          }
          if (puntos.length === 0) {
            this.mostrarToast(`Sin recorrido registrado hoy para ${vendedor.nombre}`);
            return;
          }
          this.mostrarTrayectoria(key, puntos);
        },
        error: () => {
          this.cargando.delete(key);
          // Only show error toast if this response was still desired
          if (key === this.desiredSelection) {
            this.mostrarToast(`No se pudo obtener el recorrido de ${vendedor.nombre}`);
          }
        }
      });
  }

  private ocultarTrayectoria(key: string): void {
    this.nodosSeleccionados.set([]);
    const layer = this.trayectoriasPorVendedor.get(key);
    if (!layer) return;
    this.historialLayer.removeLayer(layer);
    this.trayectoriasPorVendedor.delete(key);
  }

  private mostrarToast(mensaje: string): void {
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastMensaje.set(mensaje);
    this.toastTimeout = setTimeout(() => this.toastMensaje.set(null), 3000);
  }

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

      const horaComienzo = new Date(nodo.comienzo).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
      const esParadaReal = nodo.esParada;
      let etiqueta: string;
      if (esParadaReal) {
        const horaFin = new Date(nodo.fin).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
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

    this.seleccionado.set(key);
    this.nodosSeleccionados.set(nodos);

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

  private ajustarVistaATrayectoriasVisibles(): void {
    const bounds = L.latLngBounds([]);
    this.trayectoriasPorVendedor.forEach(grupo => {
      grupo.eachLayer(capa => {
        if (capa instanceof L.Polyline) {
          bounds.extend(capa.getBounds());
        }
      });
    });
    if (bounds.isValid()) {
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
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

}

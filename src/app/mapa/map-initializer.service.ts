import { Injectable } from '@angular/core';
import * as L from 'leaflet';
import { MAPA_CONFIG } from './mapa.config';

@Injectable({ providedIn: 'root' })
export class MapInitializerService {
  private iconsConfigured = false;

  configureDefaultIconsOnce(): void {
    if (this.iconsConfigured) return;

    delete (L.Icon.Default.prototype as any)._getIconUrl;

    const base = MAPA_CONFIG.leafletAssetsPath;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: `${base}/marker-icon-2x.png`,
      iconUrl: `${base}/marker-icon.png`,
      shadowUrl: `${base}/marker-shadow.png`,
    });

    this.iconsConfigured = true;
  }

  createMap(el: HTMLElement, center = MAPA_CONFIG.defaultCenter, zoom = MAPA_CONFIG.defaultZoom): L.Map {
    this.configureDefaultIconsOnce();

    // Los controles por defecto de Leaflet vienen en inglés ("Zoom in", "Close popup"...); se
    // crean a mano para darles textos en español.
    const map = L.map(el, { zoomControl: false, attributionControl: false }).setView([center.lat, center.lng], zoom);

    L.control.zoom({ zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(map);
    L.control.attribution({
      prefix: '<a href="https://leafletjs.com" title="Biblioteca de mapas interactivos">Leaflet</a>',
    }).addTo(map);

    // Leaflet no permite configurar el texto del botón de cerrar de los popups.
    map.on('popupopen', (evento: L.PopupEvent) => {
      const cerrar = evento.popup.getElement()?.querySelector('.leaflet-popup-close-button');
      cerrar?.setAttribute('aria-label', 'Cerrar');
      cerrar?.setAttribute('title', 'Cerrar');
    });

    L.tileLayer(MAPA_CONFIG.tileUrl, {
      maxZoom: MAPA_CONFIG.maxZoom,
      attribution: MAPA_CONFIG.attribution,
    }).addTo(map);

    return map;
  }
}

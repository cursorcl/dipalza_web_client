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

    const map = L.map(el).setView([center.lat, center.lng], zoom);

    L.tileLayer(MAPA_CONFIG.tileUrl, {
      maxZoom: MAPA_CONFIG.maxZoom,
      attribution: MAPA_CONFIG.attribution,
    }).addTo(map);

    return map;
  }
}

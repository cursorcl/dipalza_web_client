export const MAPA_CONFIG = {
  defaultCenter: { lat: -33.45, lng: -70.66 },
  defaultZoom: 18,
  maxZoom: 19,
  tileUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  leafletAssetsPath: 'assets/leaflet',
} as const;

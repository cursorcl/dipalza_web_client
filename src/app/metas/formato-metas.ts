import { formatNumber, registerLocaleData } from '@angular/common';
import localeEsCl from '@angular/common/locales/es-CL';

// Idempotente: asegura que el locale exista también fuera del arranque de la app (p. ej. en pruebas).
registerLocaleData(localeEsCl);

const LOCALE = 'es-CL';

export function tieneMeta(meta: number | null): boolean {
  return meta !== null && meta > 0;
}

export function formatearPesos(valor: number | null): string {
  if (valor === null) {
    return '—';
  }
  return '$ ' + formatNumber(valor, LOCALE, '1.0-0');
}

export function formatearAvance(avance: number | null): string {
  if (avance === null) {
    return 'Sin meta';
  }
  return formatNumber(avance, LOCALE, '1.1-1') + ' %';
}

export function anchoBarraAvance(avance: number | null): number {
  if (avance === null) {
    return 0;
  }
  return Math.min(100, Math.max(0, avance));
}

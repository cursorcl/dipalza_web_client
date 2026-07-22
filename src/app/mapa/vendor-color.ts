import { generateColorPellete } from 'app/utils/color-pallet';

const PALETTE_SIZE = 20;
const palette = generateColorPellete(PALETTE_SIZE);

/**
 * Hash djb2: determinístico y sin dependencias externas.
 */
function djb2Hash(value: string): number {
  let hash = 5381;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * Color determinístico para un vendedor a partir de su key
 * (`vendedorId_vendedorCodigo`). Misma key -> mismo color siempre,
 * sin importar el orden de llegada ni la sesión.
 */
export function colorForVendedor(key: string): string {
  const index = djb2Hash(key) % palette.length;
  return palette[index];
}

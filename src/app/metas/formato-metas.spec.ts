import { anchoBarraAvance, formatearAvance, formatearPesos, tieneMeta } from './formato-metas';

describe('formato-metas', () => {
  it('formatearPesos con valor usa puntos de miles y prefijo $', () => {
    expect(formatearPesos(12345678)).toBe('$ 12.345.678');
  });

  it('formatearPesos con null devuelve guion largo', () => {
    expect(formatearPesos(null)).toBe('—');
  });

  it('formatearAvance usa coma decimal y %', () => {
    expect(formatearAvance(61.7)).toBe('61,7 %');
  });

  it('formatearAvance con null devuelve Sin meta', () => {
    expect(formatearAvance(null)).toBe('Sin meta');
  });

  it('anchoBarraAvance satura en 100', () => {
    expect(anchoBarraAvance(125)).toBe(100);
  });

  it('anchoBarraAvance con null devuelve 0', () => {
    expect(anchoBarraAvance(null)).toBe(0);
  });

  it('anchoBarraAvance conserva valores intermedios y no baja de 0', () => {
    expect(anchoBarraAvance(61.7)).toBe(61.7);
    expect(anchoBarraAvance(-5)).toBe(0);
  });

  it('tieneMeta es falso con 0 y con null', () => {
    expect(tieneMeta(0)).toBeFalse();
    expect(tieneMeta(null)).toBeFalse();
    expect(tieneMeta(1000)).toBeTrue();
  });
});

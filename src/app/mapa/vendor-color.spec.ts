import { colorForVendedor } from './vendor-color';

describe('colorForVendedor', () => {
  it('devuelve siempre el mismo color para la misma key', () => {
    const color1 = colorForVendedor('001_0');
    const color2 = colorForVendedor('001_0');
    expect(color1).toBe(color2);
  });

  it('devuelve un color con el formato de la paleta generada', () => {
    const color = colorForVendedor('002_0');
    expect(color).toMatch(/^hsl\(\d+(\.\d+)?, 70%, 50%\)$/);
  });

  it('no depende del orden de las llamadas (sin estado compartido mutable)', () => {
    const colorA = colorForVendedor('AAA_0');
    colorForVendedor('BBB_0');
    colorForVendedor('CCC_0');
    const colorAOtraVez = colorForVendedor('AAA_0');
    expect(colorAOtraVez).toBe(colorA);
  });

  it('distintas keys pueden caer en distinto color', () => {
    const color1 = colorForVendedor('001_0');
    const color2 = colorForVendedor('999_1');
    // No garantizamos que siempre difieran (hay solo 20 colores),
    // pero para estas dos keys concretas sí deben diferir.
    expect(color1).not.toBe(color2);
  });
});

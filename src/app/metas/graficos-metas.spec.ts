import { graficoDiario, graficoMensual } from './graficos-metas';
import { TableroMeta } from './models/meta.models';

function tablero(parcial: Partial<TableroMeta> = {}): TableroMeta {
  return {
    periodo: '2026-11',
    calculadoEn: '2026-11-06T15:30:00',
    meta: null,
    vendido: 150,
    avance: null,
    cantidadVentas: 3,
    diario: [
      { fecha: '2026-11-01', vendido: 100 },
      { fecha: '2026-11-02', vendido: 0 },
      { fecha: '2026-11-03', vendido: 50 }
    ],
    mensual: [],
    ...parcial
  };
}

describe('graficos-metas', () => {

  it('graficoDiario_acumuladoEsSumaCorrida', () => {
    const config = graficoDiario(tablero());
    expect(config.data.labels).toEqual(['1', '2', '3']);
    expect(config.data.datasets[0].data).toEqual([100, 0, 50]);
    expect(config.data.datasets[1].data).toEqual([100, 100, 150]);
  });

  it('graficoDiario_sinMeta_noAgregaLineaDeMeta', () => {
    expect(graficoDiario(tablero({ meta: null })).data.datasets.length).toBe(2);
    expect(graficoDiario(tablero({ meta: 0 })).data.datasets.length).toBe(2);
  });

  it('graficoDiario_conMeta_lineaConstante', () => {
    const config = graficoDiario(tablero({ meta: 3000 }));
    expect(config.data.datasets.length).toBe(3);
    expect(config.data.datasets[2].data).toEqual([3000, 3000, 3000]);
  });

  it('graficoMensual_dosBarrasMetaYVenta_metaNullSinBarra', () => {
    const config = graficoMensual(tablero({
      mensual: [
        { periodo: '2026-09', vendido: 10, meta: 100 },
        { periodo: '2026-10', vendido: 20, meta: null },
        { periodo: '2026-11', vendido: 30, meta: 100 },
        { periodo: '2026-12', vendido: 0, meta: 0 }
      ]
    }));
    const [meta, vendido] = config.data.datasets;
    expect(meta.type).toBe('bar');
    expect(meta.label).toBe('Meta');
    expect(meta.data).toEqual([100, null, 100, null]);
    expect(vendido.type).toBe('bar');
    expect(vendido.label).toBe('Vendido');
    expect(vendido.data).toEqual([10, 20, 30, 0]);
  });

  it('graficoMensual_ultimaEtiquetaMarcaEnCurso', () => {
    const config = graficoMensual(tablero({
      mensual: [
        { periodo: '2025-12', vendido: 10, meta: 100 },
        { periodo: '2026-11', vendido: 30, meta: 100 }
      ]
    }));
    const etiquetas = config.data.labels as string[];
    expect(etiquetas[0]).toBe('dic 2025');
    expect(etiquetas[1]).toBe('nov 2026 (en curso)');
  });
});

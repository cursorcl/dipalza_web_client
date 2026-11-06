import { formatDate } from '@angular/common';
import { Chart, ChartConfiguration, LegendItem } from 'chart.js';
import { formatearPesos, tieneMeta } from './formato-metas';
import { TableroMeta } from './models/meta.models';

const LOCALE = 'es-CL';
const COLOR_VENDIDO = 'rgba(13, 110, 253, 0.55)';
const COLOR_LINEA = '#198754';
const COLOR_META = '#dc3545';
const COLOR_META_BARRA = 'rgba(220, 53, 69, 0.45)';

/** "2026-11" -> "nov 2026" (sin el punto final que es-CL pueda agregar a la abreviatura). */
function etiquetaMes(periodo: string): string {
  const [anio, mes] = periodo.split('-').map(Number);
  return formatDate(new Date(anio, mes - 1, 1), 'MMM y', LOCALE).replace('.', '');
}

/** Ícono de la leyenda según el tipo de serie: línea para 'line', rectángulo para 'bar'. */
export function estiloLeyenda(item: LegendItem, tipo: string | undefined): LegendItem {
  return tipo === 'line'
    ? { ...item, pointStyle: 'line', lineWidth: 3 }
    : { ...item, pointStyle: 'rect' };
}

function opciones(): ChartConfiguration<'bar' | 'line'>['options'] {
  return {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        ticks: { callback: (valor) => formatearPesos(Number(valor)) }
      }
    },
    plugins: {
      legend: {
        labels: {
          // En la leyenda, las series de línea (acumulado y meta del mes) se muestran como
          // una línea, con su trazo punteado si lo tienen; las de barra, como rectángulo.
          usePointStyle: true,
          generateLabels: (chart) => Chart.defaults.plugins.legend.labels.generateLabels(chart)
            .map(item => estiloLeyenda(item, chart.data.datasets[item.datasetIndex ?? 0]?.type))
        }
      },
      tooltip: {
        callbacks: {
          label: (contexto) => {
            const valor = contexto.parsed.y;
            return `${contexto.dataset.label}: ${valor === null ? '—' : formatearPesos(valor)}`;
          }
        }
      }
    }
  };
}

export function graficoDiario(t: TableroMeta): ChartConfiguration<'bar' | 'line'> {
  const vendidos = t.diario.map(d => d.vendido);
  let corrido = 0;
  const acumulado = vendidos.map(v => (corrido += v));

  const datasets: ChartConfiguration<'bar' | 'line'>['data']['datasets'] = [
    { type: 'bar', label: 'Vendido del día', data: vendidos, backgroundColor: COLOR_VENDIDO },
    {
      type: 'line', label: 'Acumulado del mes', data: acumulado,
      borderColor: COLOR_LINEA, backgroundColor: COLOR_LINEA, pointRadius: 2
    }
  ];
  if (tieneMeta(t.meta)) {
    datasets.push({
      type: 'line', label: 'Meta del mes', data: vendidos.map(() => t.meta as number),
      borderColor: COLOR_META, backgroundColor: COLOR_META, borderDash: [6, 4], pointRadius: 0
    });
  }

  return {
    type: 'bar',
    data: { labels: t.diario.map(d => String(Number(d.fecha.slice(8, 10)))), datasets },
    options: opciones()
  };
}

export function graficoMensual(t: TableroMeta): ChartConfiguration<'bar' | 'line'> {
  const ultimo = t.mensual.length - 1;
  const etiquetas = t.mensual.map((m, i) => etiquetaMes(m.periodo) + (i === ultimo ? ' (en curso)' : ''));

  return {
    type: 'bar',
    data: {
      labels: etiquetas,
      // Dos barras por mes, lado a lado: la meta del mes (sin barra si no hay meta) y lo vendido.
      datasets: [
        {
          type: 'bar', label: 'Meta', data: t.mensual.map(m => (tieneMeta(m.meta) ? m.meta : null)),
          backgroundColor: COLOR_META_BARRA
        },
        { type: 'bar', label: 'Vendido', data: t.mensual.map(m => m.vendido), backgroundColor: COLOR_VENDIDO }
      ]
    },
    options: opciones()
  };
}

import { formatDate } from '@angular/common';
import { ChartConfiguration } from 'chart.js';
import { formatearPesos, tieneMeta } from './formato-metas';
import { TableroMeta } from './models/meta.models';

const LOCALE = 'es-CL';
const COLOR_VENDIDO = 'rgba(13, 110, 253, 0.55)';
const COLOR_LINEA = '#198754';
const COLOR_META = '#dc3545';

/** "2026-11" -> "nov 2026" (sin el punto final que es-CL pueda agregar a la abreviatura). */
function etiquetaMes(periodo: string): string {
  const [anio, mes] = periodo.split('-').map(Number);
  return formatDate(new Date(anio, mes - 1, 1), 'MMM y', LOCALE).replace('.', '');
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
      datasets: [
        { type: 'bar', label: 'Vendido', data: t.mensual.map(m => m.vendido), backgroundColor: COLOR_VENDIDO },
        {
          type: 'line', label: 'Meta', data: t.mensual.map(m => (tieneMeta(m.meta) ? m.meta : null)),
          borderColor: COLOR_META, backgroundColor: COLOR_META, spanGaps: false, pointRadius: 3
        }
      ]
    },
    options: opciones()
  };
}

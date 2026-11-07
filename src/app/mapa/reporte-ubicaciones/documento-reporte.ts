import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  DiaReporte, formatearDuracion, formatearFechaLarga, formatearHora,
} from './datos-reporte';
import { ALTO_MAPA_PX, ANCHO_MAPA_PX } from './mapa-estatico';

export interface MetaReporte {
  desde: string;
  hasta: string;
  generadoEn: Date;
  usuario: string | null;
}

export interface VendedorReporte {
  codigo: string;
  tipo: string;
  nombre: string;
}

export const FILAS_INDICE_POR_PAGINA = 30;

const MARGEN = 15;
const ANCHO_PAGINA = 210;
const ALTO_PAGINA = 297;
const ANCHO_IMAGEN = ANCHO_PAGINA - 2 * MARGEN; // 180 mm
const ALTO_IMAGEN = (ANCHO_IMAGEN * ALTO_MAPA_PX) / ANCHO_MAPA_PX; // 112,5 mm
const Y_PIE = ALTO_PAGINA - 8;

interface EntradaIndice {
  vendedor: VendedorReporte;
  dias: number;
  paradas: number;
  pagina: number | null;
}

interface PieDia {
  nombre: string;
  fecha: string;
}

const dosDigitos = (n: number) => String(n).padStart(2, '0');

/** "viernes 6 de noviembre de 2026" -> "6 de noviembre de 2026". */
function sinDiaSemana(fecha: string): string {
  return formatearFechaLarga(fecha).replace(/^\S+\s/, '');
}

export class DocumentoReporte {
  private readonly doc: jsPDF;
  private readonly paginasIndice: number;
  private readonly indice: EntradaIndice[] = [];
  private readonly pies = new Map<number, PieDia>();

  /** `comprimir = false` permite buscar texto dentro del PDF en las pruebas. */
  constructor(private readonly meta: MetaReporte, cantidadVendedores: number, comprimir = true) {
    this.doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: comprimir });
    this.paginasIndice = Math.ceil(Math.max(cantidadVendedores, 1) / FILAS_INDICE_POR_PAGINA);
    for (let i = 1; i < this.paginasIndice; i++) this.doc.addPage();
  }

  get cantidadPaginas(): number {
    return this.doc.getNumberOfPages();
  }

  agregarVendedor(vendedor: VendedorReporte, dias: DiaReporte[], imagenes: string[]): void {
    const totalParadas = dias.reduce((s, d) => s + d.paradas.length, 0);
    if (dias.length === 0) {
      this.indice.push({ vendedor, dias: 0, paradas: 0, pagina: null });
      return;
    }
    this.indice.push({ vendedor, dias: dias.length, paradas: totalParadas, pagina: this.cantidadPaginas + 1 });
    dias.forEach((dia, i) => this.agregarDia(vendedor, dia, imagenes[i], i === 0, dias.length, totalParadas));
  }

  finalizar(): Blob {
    this.escribirIndice();
    const total = this.cantidadPaginas;
    for (let p = 1; p <= total; p++) {
      this.doc.setPage(p);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(90);
      const pie = this.pies.get(p);
      if (pie) this.doc.text(`${pie.nombre} · ${formatearFechaLarga(pie.fecha)}`, MARGEN, Y_PIE);
      this.doc.text(`Página ${p} de ${total}`, ANCHO_PAGINA - MARGEN, Y_PIE, { align: 'right' });
    }
    return this.doc.output('blob');
  }

  private agregarDia(
    vendedor: VendedorReporte, dia: DiaReporte, imagen: string,
    primeraDelVendedor: boolean, totalDias: number, totalParadas: number,
  ): void {
    const doc = this.doc;
    doc.addPage();
    const paginaInicial = this.cantidadPaginas;
    const pie: PieDia = { nombre: vendedor.nombre, fecha: dia.fecha };
    this.pies.set(paginaInicial, pie);

    this.dibujarEncabezado(vendedor, primeraDelVendedor, totalDias, totalParadas);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(formatearFechaLarga(dia.fecha), MARGEN, 36);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const primera = dia.posiciones[0];
    const ultima = dia.posiciones[dia.posiciones.length - 1];
    doc.text(
      `Primera posición ${formatearHora(primera.fechaHora)} · Última posición ${formatearHora(ultima.fechaHora)} · ${dia.posiciones.length} posiciones`,
      MARGEN, 42,
    );
    doc.addImage(imagen, 'JPEG', MARGEN, 46, ANCHO_IMAGEN, ALTO_IMAGEN);

    const yTabla = 46 + ALTO_IMAGEN + 6;
    if (dia.paradas.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(90);
      doc.text('Sin paradas detectadas', MARGEN, yTabla + 4);
      return;
    }

    autoTable(doc, {
      startY: yTabla,
      margin: { left: MARGEN, right: MARGEN, top: 20, bottom: 15 },
      showHead: 'everyPage',
      head: [['N°', 'Calle', 'Llegada', 'Salida', 'Duración']],
      body: dia.paradas.map((p, i) => {
        const duracion = formatearDuracion(p.horaInicio, p.horaFin, this.meta.generadoEn);
        return [
          String(i + 1),
          p.calle ?? `— (${p.latitud.toFixed(5)}, ${p.longitud.toFixed(5)})`,
          formatearHora(p.horaInicio),
          p.enCurso ? 'en curso' : formatearHora(p.horaFin ?? ''),
          p.enCurso ? `${duracion} (en curso)` : duracion,
        ];
      }),
      styles: { fontSize: 9, cellPadding: 1.5 },
      headStyles: { fillColor: [52, 73, 94] },
      columnStyles: { 0: { cellWidth: 12 }, 2: { cellWidth: 22 }, 3: { cellWidth: 24 }, 4: { cellWidth: 36 } },
      didDrawPage: () => {
        const pagina = doc.getCurrentPageInfo().pageNumber;
        if (pagina === paginaInicial) return;
        this.pies.set(pagina, pie);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(90);
        doc.text(vendedor.nombre, MARGEN, 12);
      },
    });
  }

  private dibujarEncabezado(
    vendedor: VendedorReporte, primera: boolean, totalDias: number, totalParadas: number,
  ): void {
    const doc = this.doc;
    doc.setTextColor(0);
    if (primera) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(vendedor.nombre, MARGEN, 20);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(
        `Código ${vendedor.codigo} · ${totalDias} ${totalDias === 1 ? 'día' : 'días'} con datos · ${totalParadas} paradas`,
        MARGEN, 27,
      );
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(vendedor.nombre, MARGEN, 20);
    }
  }

  private escribirIndice(): void {
    const doc = this.doc;
    doc.setPage(1);
    doc.setTextColor(0);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('Reporte de ubicaciones', MARGEN, 24);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    const { desde, hasta, generadoEn, usuario } = this.meta;
    const rango = desde === hasta
      ? sinDiaSemana(desde)
      : `del ${sinDiaSemana(desde)} al ${sinDiaSemana(hasta)}`;
    doc.text(rango, MARGEN, 32);
    const g = generadoEn;
    doc.text(
      `Generado el ${dosDigitos(g.getDate())}-${dosDigitos(g.getMonth() + 1)}-${g.getFullYear()} ${dosDigitos(g.getHours())}:${dosDigitos(g.getMinutes())}`,
      MARGEN, 38,
    );
    if (usuario !== null) doc.text(`Usuario: ${usuario}`, MARGEN, 44);

    const filas = this.indice.length === 0 ? [null] : this.indice;
    for (let k = 0; k < this.paginasIndice; k++) {
      const grupo = this.indice.slice(k * FILAS_INDICE_POR_PAGINA, (k + 1) * FILAS_INDICE_POR_PAGINA);
      if (grupo.length === 0 && filas[0] !== null) continue;
      doc.setPage(k + 1);
      autoTable(doc, {
        startY: k === 0 ? 52 : 20,
        margin: { left: MARGEN, right: MARGEN, top: 20, bottom: 15 },
        head: [['Vendedor', 'Código', 'Días con datos', 'Paradas', 'Página']],
        body: grupo.map(e => [
          e.vendedor.nombre,
          e.vendedor.codigo,
          e.dias === 0 ? 'sin registros' : String(e.dias),
          e.dias === 0 ? '' : String(e.paradas),
          e.pagina === null ? '—' : String(e.pagina),
        ]),
        styles: { fontSize: 9, cellPadding: 1.5 },
        headStyles: { fillColor: [52, 73, 94] },
        columnStyles: { 0: { overflow: 'ellipsize' }, 1: { cellWidth: 22 }, 2: { cellWidth: 34 }, 3: { cellWidth: 20 }, 4: { cellWidth: 20 } },
      });
    }
  }
}

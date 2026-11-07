import { HistorialPosicionDTO, ParadaVendedorDTO } from '../models/model';
import { DiaReporte } from './datos-reporte';
import { DocumentoReporte, MetaReporte, VendedorReporte } from './documento-reporte';

const JPEG_MINIMO =
  'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

const meta: MetaReporte = {
  desde: '2026-11-05', hasta: '2026-11-06', generadoEn: new Date(2026, 10, 6, 15, 30), usuario: 'admin',
};

function vendedor(i: number): VendedorReporte {
  return { codigo: String(i), tipo: 'V', nombre: `Vendedor ${i}` };
}

function posicion(fecha: string, minuto: number): HistorialPosicionDTO {
  return {
    id: minuto, vendedorId: 'V1', vendedorCodigo: '1', vendedorNombre: 'Vendedor 1',
    fechaHora: `${fecha}T08:${String(minuto).padStart(2, '0')}:00`, latitud: -41.4, longitud: -73.0,
  };
}

function parada(fecha: string, calle: string | null, enCurso: boolean): ParadaVendedorDTO {
  return {
    id: 1, vendedorId: 'V1', vendedorCodigo: '1', vendedorNombre: 'Vendedor 1',
    latitud: -41.46789, longitud: -72.93456, calle,
    horaInicio: `${fecha}T09:00:00`, horaFin: enCurso ? null : `${fecha}T09:30:00`, enCurso,
  };
}

function dia(fecha: string, paradas: ParadaVendedorDTO[] = []): DiaReporte {
  return { fecha, posiciones: [posicion(fecha, 0), posicion(fecha, 10)], paradas };
}

async function texto(doc: DocumentoReporte): Promise<string> {
  const blob = doc.finalizar();
  expect(blob.type).toBe('application/pdf');
  return new TextDecoder('latin1').decode(await blob.arrayBuffer());
}

describe('DocumentoReporte', () => {
  it('un vendedor con 2 días produce 1 página de índice + 2 páginas', () => {
    const doc = new DocumentoReporte(meta, 1, false);
    doc.agregarVendedor(vendedor(1), [dia('2026-11-05'), dia('2026-11-06')], [JPEG_MINIMO, JPEG_MINIMO]);
    expect(doc.cantidadPaginas).toBe(3);
  });

  it('un vendedor sin días aparece en el índice como "sin registros" y no agrega páginas', async () => {
    const doc = new DocumentoReporte(meta, 1, false);
    doc.agregarVendedor(vendedor(1), [], []);
    expect(doc.cantidadPaginas).toBe(1);
    expect(await texto(doc)).toContain('sin registros');
  });

  it('40 vendedores reservan 2 páginas de índice', async () => {
    const doc = new DocumentoReporte(meta, 40, false);
    for (let i = 1; i <= 40; i++) {
      // Código con prefijo para que no choque con los números de página.
      doc.agregarVendedor({ codigo: `C${i}`, tipo: 'V', nombre: `Vendedor ${i}` }, [dia('2026-11-06')], [JPEG_MINIMO]);
    }
    expect(doc.cantidadPaginas).toBe(42);
    const t = await texto(doc);
    // Celdas de la fila de un vendedor: desde su nombre hasta el nombre del siguiente (o el final).
    const fila = (n: number): string => {
      const inicio = t.indexOf(`(Vendedor ${n}) Tj`);
      expect(inicio).toBeGreaterThan(-1);
      const fin = n < 40 ? t.indexOf(`(Vendedor ${n + 1}) Tj`, inicio) : inicio + 1200;
      return t.slice(inicio, fin);
    };
    // Con 2 páginas de índice, el vendedor n empieza en la página n + 2.
    expect(fila(1)).toContain('(3) Tj');
    expect(fila(1)).not.toMatch(/\((2|4)\) Tj/);
    expect(fila(31)).toContain('(33) Tj'); // primera fila de la segunda página de índice
    expect(fila(40)).toContain('(42) Tj');
  });

  it('una parada en curso muestra "en curso" y la calle nula muestra coordenadas', async () => {
    const doc = new DocumentoReporte(meta, 1, false);
    doc.agregarVendedor(vendedor(1), [dia('2026-11-06', [parada('2026-11-06', null, true)])], [JPEG_MINIMO]);
    const t = await texto(doc);
    expect(t).toContain('en curso');
    expect(t).toContain('— \\(-41.46789, -72.93456\\)');  // jsPDF escapa los paréntesis
  });

  it('sin paradas muestra "Sin paradas detectadas"', async () => {
    const doc = new DocumentoReporte(meta, 1, false);
    doc.agregarVendedor(vendedor(1), [dia('2026-11-06')], [JPEG_MINIMO]);
    expect(await texto(doc)).toContain('Sin paradas detectadas');
  });

  it('el pie muestra "Página 2 de 3"', async () => {
    const doc = new DocumentoReporte(meta, 1, false);
    doc.agregarVendedor(vendedor(1), [dia('2026-11-05'), dia('2026-11-06')], [JPEG_MINIMO, JPEG_MINIMO]);
    const t = await texto(doc);
    expect(t).toContain('Página 2 de 3');
    expect(t).toContain('Página 1 de 3');
  });
});

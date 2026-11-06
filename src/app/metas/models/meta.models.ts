export interface VendidoDia {
  fecha: string;
  vendido: number;
}

export interface VendidoMes {
  periodo: string;
  vendido: number;
  meta: number | null;
}

export interface TableroMeta {
  periodo: string;
  calculadoEn: string;
  meta: number | null;
  vendido: number;
  avance: number | null;
  cantidadVentas: number;
  diario: VendidoDia[];
  mensual: VendidoMes[];
}

export interface MetaVendedorFila {
  codigo: string;
  tipo: string;
  nombre: string;
  meta: number | null;
  vendido: number;
  avance: number | null;
  cantidadVentas: number;
}

export interface TableroEquipo {
  equipo: TableroMeta;
  vendedores: MetaVendedorFila[];
}

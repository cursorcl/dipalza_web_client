export interface Usuario {
  id: number;
  username: string;
  email: string | null;
  codigoVendedor: string | null;
  tipoVendedor: string | null;
  nombreVendedor: string | null;
  enabled: boolean;
  locked: boolean;
  createdAt: string | null;
}

export interface CrearUsuarioPayload {
  username: string;
  email?: string;
  codigoVendedor?: string;
  tipoVendedor?: string;
  password: string;
}

export interface CrearUsuarioResult {
  usuario: Usuario;
  correoEnviado: boolean;
}

export interface ActualizarUsuarioPayload {
  email?: string;
  codigoVendedor?: string;
  tipoVendedor?: string;
  enabled: boolean;
  locked: boolean;
}

/** Campos de un ticket de pesaje (recepción de carga en báscula). */
export const VOUCHER_FIELDS = [
  "folio",
  "fecha",
  "hora",
  "empresa",
  "rut_empresa",
  "direccion_empresa",
  "tipo_documento",
  "patente",
  "cliente_rut",
  "cliente",
  "generador",
  "producto_codigo",
  "producto",
  "origen",
  "guia",
  "chofer_rut",
  "chofer",
  "transportista_rut",
  "transportista",
  "entrada_fecha",
  "entrada_hora",
  "peso_entrada",
  "entrada_usuario",
  "salida_fecha",
  "salida_hora",
  "peso_salida",
  "salida_usuario",
  "peso_neto",
  "peso_neto_inf",
  "diferencia",
  "recepcion",
  "observacion",
  "otros_datos",
] as const;

export type VoucherField = (typeof VOUCHER_FIELDS)[number];

/** Datos leídos del ticket. Todos son texto; "" significa "No identificado". */
export type VoucherData = Record<VoucherField, string>;

export const ESTADOS = ["Registrado", "Verificado", "Observado", "Eliminado"] as const;
export type Estado = (typeof ESTADOS)[number];

/** Metadatos que la app agrega automáticamente a cada registro. */
export interface RecordMeta {
  id: string;
  creado_en: string; // ISO 8601
  creado_por: string; // nombre de usuario
  estado: Estado;
  foto_ref: string; // referencia interna (local:xxx o drive:xxx)
  foto_url: string; // enlace para abrir la foto original
  actualizado_en: string;
  actualizado_por: string;
}

export type VoucherRecord = VoucherData & RecordMeta;

export const ROLES = ["admin", "usuario", "consulta"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  admin: "Administrador",
  usuario: "Usuario",
  consulta: "Consulta",
};

export interface User {
  id: string;
  usuario: string;
  nombre: string;
  rol: Role;
  password_hash: string;
  activo: boolean;
  creado_en: string;
}

export type PublicUser = Omit<User, "password_hash">;

export function emptyVoucher(): VoucherData {
  return Object.fromEntries(VOUCHER_FIELDS.map((f) => [f, ""])) as VoucherData;
}

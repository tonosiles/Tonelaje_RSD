export const VOUCHER_FIELDS = [
  "fecha",
  "hora",
  "comercio",
  "rut_comercio",
  "numero_voucher",
  "id_transaccion",
  "numero_operacion",
  "codigo_autorizacion",
  "monto",
  "propina",
  "monto_total",
  "medio_pago",
  "tipo_tarjeta",
  "ultimos_4_digitos",
  "debito_credito",
  "cuotas",
  "banco",
  "terminal",
  "numero_comercio",
  "sucursal",
  "cajero",
  "moneda",
  "otros_datos",
] as const;

export type VoucherField = (typeof VOUCHER_FIELDS)[number];

/** Datos leídos del voucher. Todos son texto; "" significa "No identificado". */
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

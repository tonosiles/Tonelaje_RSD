import type { VoucherField } from "./types";

export interface FieldDef {
  key: VoucherField;
  label: string;
  type?: "date" | "time" | "money" | "text" | "textarea";
  inputMode?: "numeric" | "decimal" | "text";
}

/** Orden y etiquetas de los campos en la pantalla "Revisar información". */
export const FIELD_DEFS: FieldDef[] = [
  { key: "comercio", label: "Nombre del comercio" },
  { key: "rut_comercio", label: "RUT del comercio" },
  { key: "fecha", label: "Fecha", type: "date" },
  { key: "hora", label: "Hora", type: "time" },
  { key: "monto", label: "Monto", type: "money", inputMode: "decimal" },
  { key: "propina", label: "Propina", type: "money", inputMode: "decimal" },
  { key: "monto_total", label: "Monto final pagado", type: "money", inputMode: "decimal" },
  { key: "moneda", label: "Moneda" },
  { key: "medio_pago", label: "Medio de pago" },
  { key: "tipo_tarjeta", label: "Tipo de tarjeta" },
  { key: "debito_credito", label: "Débito o crédito" },
  { key: "ultimos_4_digitos", label: "Últimos 4 dígitos", inputMode: "numeric" },
  { key: "cuotas", label: "Número de cuotas", inputMode: "numeric" },
  { key: "banco", label: "Banco o emisor" },
  { key: "codigo_autorizacion", label: "Código de autorización" },
  { key: "numero_operacion", label: "Número de operación" },
  { key: "id_transaccion", label: "ID de transacción" },
  { key: "numero_voucher", label: "Número de voucher / boleta" },
  { key: "terminal", label: "Terminal o POS" },
  { key: "numero_comercio", label: "Número de comercio" },
  { key: "sucursal", label: "Sucursal" },
  { key: "cajero", label: "Cajero u operador" },
  { key: "otros_datos", label: "Otros datos relevantes", type: "textarea" },
];

export const FIELD_LABELS = Object.fromEntries(FIELD_DEFS.map((f) => [f.key, f.label])) as Record<
  VoucherField,
  string
>;

export const NO_IDENTIFICADO = "No identificado";

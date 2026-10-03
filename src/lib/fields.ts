import type { VoucherField } from "./types";

export interface FieldDef {
  key: VoucherField;
  label: string;
  type?: "date" | "time" | "weight" | "text" | "textarea";
  inputMode?: "numeric" | "decimal" | "text";
  section: string;
}

/** Orden, secciones y etiquetas de los campos en la pantalla "Revisar información". */
export const FIELD_DEFS: FieldDef[] = [
  { key: "folio", label: "Folio", inputMode: "numeric", section: "Ticket" },
  { key: "fecha", label: "Fecha del ticket", type: "date", section: "Ticket" },
  { key: "hora", label: "Hora del ticket", type: "time", section: "Ticket" },
  { key: "tipo_documento", label: "Tipo de documento", section: "Ticket" },
  { key: "empresa", label: "Empresa que emite", section: "Ticket" },
  { key: "rut_empresa", label: "RUT de la empresa", section: "Ticket" },
  { key: "direccion_empresa", label: "Dirección de la empresa", section: "Ticket" },

  { key: "patente", label: "Patente", section: "Identificación" },
  { key: "cliente", label: "Cliente", section: "Identificación" },
  { key: "cliente_rut", label: "RUT del cliente", section: "Identificación" },
  { key: "generador", label: "Generador", section: "Identificación" },
  { key: "producto", label: "Producto", section: "Identificación" },
  { key: "producto_codigo", label: "Código de producto", section: "Identificación" },
  { key: "origen", label: "Origen", section: "Identificación" },
  { key: "guia", label: "Guía", section: "Identificación" },
  { key: "chofer", label: "Chofer", section: "Identificación" },
  { key: "chofer_rut", label: "RUT del chofer", section: "Identificación" },
  { key: "transportista", label: "Transportista", section: "Identificación" },
  { key: "transportista_rut", label: "RUT del transportista", section: "Identificación" },

  { key: "entrada_fecha", label: "Fecha de entrada", type: "date", section: "Pesaje" },
  { key: "entrada_hora", label: "Hora de entrada", type: "time", section: "Pesaje" },
  { key: "peso_entrada", label: "Peso de entrada (kg)", type: "weight", inputMode: "numeric", section: "Pesaje" },
  { key: "entrada_usuario", label: "Usuario báscula entrada", section: "Pesaje" },
  { key: "salida_fecha", label: "Fecha de salida", type: "date", section: "Pesaje" },
  { key: "salida_hora", label: "Hora de salida", type: "time", section: "Pesaje" },
  { key: "peso_salida", label: "Peso de salida (kg)", type: "weight", inputMode: "numeric", section: "Pesaje" },
  { key: "salida_usuario", label: "Usuario báscula salida", section: "Pesaje" },
  { key: "peso_neto", label: "Peso neto (kg)", type: "weight", inputMode: "numeric", section: "Pesaje" },
  { key: "peso_neto_inf", label: "Peso neto informado (kg)", type: "weight", inputMode: "numeric", section: "Pesaje" },
  { key: "diferencia", label: "Diferencia", section: "Pesaje" },

  { key: "recepcion", label: "Timbre de recepción", type: "textarea", section: "Otros" },
  { key: "observacion", label: "Observación", type: "textarea", section: "Otros" },
  { key: "otros_datos", label: "Otros datos relevantes", type: "textarea", section: "Otros" },
];

/** Campos agrupados por sección, en el orden de FIELD_DEFS. */
export const FIELD_SECTIONS: { title: string; fields: FieldDef[] }[] = FIELD_DEFS.reduce(
  (acc, f) => {
    const last = acc[acc.length - 1];
    if (last?.title === f.section) last.fields.push(f);
    else acc.push({ title: f.section, fields: [f] });
    return acc;
  },
  [] as { title: string; fields: FieldDef[] }[],
);

/** Campos que se guardan como número (kilos) en la planilla y en Excel. */
export const WEIGHT_FIELDS = FIELD_DEFS.filter((f) => f.type === "weight").map((f) => f.key);

export const FIELD_LABELS = Object.fromEntries(FIELD_DEFS.map((f) => [f.key, f.label])) as Record<
  VoucherField,
  string
>;

export const NO_IDENTIFICADO = "No identificado";

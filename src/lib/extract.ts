import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { VOUCHER_FIELDS, emptyVoucher, type VoucherData, type VoucherField } from "./types";

const fieldShape = Object.fromEntries(VOUCHER_FIELDS.map((f) => [f, z.string()])) as Record<
  VoucherField,
  z.ZodString
>;

const ExtractionSchema = z.object({
  es_voucher: z.boolean(),
  ...fieldShape,
  campos_dudosos: z.array(z.string()),
  observaciones: z.string(),
});

export interface ExtractionResult {
  data: VoucherData;
  dudosos: VoucherField[];
  observaciones: string;
  es_voucher: boolean;
  modelo: string;
  simulado: boolean;
}

const SYSTEM_PROMPT = `Eres un sistema de lectura de tickets de pesaje de camiones (ticket de báscula o "Ticket de pesaje - Recepción de carga") de rellenos sanitarios y centros de manejo de residuos de Chile. Un ticket típico trae: empresa emisora con RUT y dirección, fecha y hora, FOLIO, una sección IDENTIFICACION (patente, cliente, generador, producto, origen, guía, chofer, transportista, cada uno con RUT o código y nombre), una sección PESAJE con filas de Entrada y Salida (fecha, hora, peso, usuario), el Peso Neto, el Peso Neto Inf., una diferencia, observaciones y a veces un timbre manuscrito de recepción.

Tu tarea es transcribir los datos impresos o escritos en la fotografía a los campos solicitados.

Reglas estrictas:
- No inventes ni deduzcas información que no esté en el ticket. Si un dato no aparece o el campo está en blanco en el ticket, deja el campo como cadena vacía "".
- Si lees un dato pero con dudas (borroso, cortado, arrugado, tapado por una firma), escríbelo y agrega el nombre del campo a "campos_dudosos".
- La imagen puede estar inclinada, rotada, con sombras o arrugada: léela en la orientación correcta.

Formato de los campos:
- fecha, entrada_fecha, salida_fecha: AAAA-MM-DD. En Chile las fechas son día-mes-año (21-08-2026). Ojo: el encabezado puede venir en formato mes.día.año (08.21.2026 = 21 de agosto); usa el que sea coherente con las fechas de entrada y salida. Si el año tiene 2 dígitos, asume 20XX.
- hora, entrada_hora, salida_hora: HH:MM en 24 horas. "fecha" y "hora" son las del encabezado del ticket.
- peso_entrada, peso_salida, peso_neto, peso_neto_inf: kilos como número entero, sin separador de miles ni unidad. En estos tickets el punto separa miles: "24.630" es 24630 kg.
- Comprueba que peso_entrada - peso_salida = peso_neto. Si no cuadra, transcribe lo que dice el ticket y agrega esos tres campos a "campos_dudosos".
- folio, guia, producto_codigo: cópialos exactamente, incluidos ceros a la izquierda.
- patente: en mayúsculas y sin espacios ni guiones (ej. "SWGS52").
- rut_empresa, cliente_rut, chofer_rut, transportista_rut: normalizados al formato 12.345.678-9 (con puntos de miles y guion; si el ticket usa comas, cámbialas por puntos). Conserva la K mayúscula del dígito verificador.
- empresa, cliente, chofer, transportista, generador, producto, origen: el nombre tal como aparece.
- entrada_usuario, salida_usuario: el usuario o modo de la báscula tal como aparece (ej. "PJE/AUTO MANUEL").
- diferencia: como aparece (ej. "0", "0 %").
- tipo_documento: el título del documento (ej. "Ticket de pesaje - Recepción de carga").
- recepcion: texto del timbre o anotación manuscrita de recepción, si hay (ej. "Centro de Manejo de Residuos Malleco Norte - Recepcionado báscula - 21/08/26").
- observacion: el texto de la sección Observación. Una firma no es texto: si solo hay una firma, escribe "Firmado".
- otros_datos: cualquier otro dato relevante, en texto breve separado por "; ".
- es_voucher: false si la imagen claramente no es un ticket de pesaje ni un comprobante similar.
- observaciones: una frase breve sobre la calidad de lectura o problemas encontrados, o "" si no hay.`;

function client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export function extractionEnabled() {
  return !!process.env.ANTHROPIC_API_KEY;
}

export async function extractVoucher(image: Buffer, mediaType: "image/jpeg" | "image/png" | "image/webp"): Promise<ExtractionResult> {
  if (!extractionEnabled()) return mockExtraction();

  const model = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
  const response = await client().beta.messages.parse({
    model,
    max_tokens: 16000,
    // Si el modelo principal declina, la API reintenta automáticamente con un modelo alternativo.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: (process.env.ANTHROPIC_EFFORT as "low" | "medium" | "high") || "medium", format: betaZodOutputFormat(ExtractionSchema) },
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: image.toString("base64") } },
          { type: "text", text: "Extrae los datos de este ticket de pesaje." },
        ],
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("El modelo no pudo procesar esta imagen.");
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("No se pudo interpretar la respuesta del modelo. Intente nuevamente.");

  const data = emptyVoucher();
  for (const f of VOUCHER_FIELDS) data[f] = cleanValue(parsed[f]);
  return {
    data,
    dudosos: parsed.campos_dudosos.filter((f): f is VoucherField => (VOUCHER_FIELDS as readonly string[]).includes(f)),
    observaciones: parsed.observaciones,
    es_voucher: parsed.es_voucher,
    modelo: response.model,
    simulado: false,
  };
}

/** Normaliza valores que el modelo pudiera devolver como "no identificado". */
function cleanValue(v: string): string {
  const s = (v ?? "").trim();
  return /^(no identificado|n\/a|null|none|-+)$/i.test(s) ? "" : s;
}

/** Respuesta simulada para probar la app sin ANTHROPIC_API_KEY. */
function mockExtraction(): ExtractionResult {
  const data = emptyVoucher();
  const today = new Date().toISOString().slice(0, 10);
  const folio = String(Math.floor(Math.random() * 90000) + 10000);
  Object.assign(data, {
    folio,
    fecha: today,
    hora: "16:03",
    tipo_documento: "Ticket de pesaje - Recepción de carga",
    empresa: "Empresa de Prueba S.A.",
    rut_empresa: "76.123.456-7",
    patente: "ABCD12",
    cliente_rut: "76.987.654-3",
    cliente: "Cliente de Prueba SpA",
    producto_codigo: "01",
    producto: "DOMICILIARIO",
    origen: "COMUNA DE PRUEBA",
    chofer_rut: "12.345.678-9",
    chofer: "CHOFER DE PRUEBA",
    entrada_fecha: today,
    entrada_hora: "15:34",
    peso_entrada: "24630",
    entrada_usuario: "PJE/AUTO",
    salida_fecha: today,
    salida_hora: "16:03",
    peso_salida: "13320",
    salida_usuario: "PJE/AUTO",
    peso_neto: "11310",
    peso_neto_inf: "0",
    diferencia: "0",
  });

  return {
    data,
    dudosos: ["patente"],
    observaciones: "Lectura simulada: configure ANTHROPIC_API_KEY para leer tickets reales.",
    es_voucher: true,
    modelo: "simulado",
    simulado: true,
  };
}

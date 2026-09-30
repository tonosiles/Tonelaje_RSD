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

const SYSTEM_PROMPT = `Eres un sistema de lectura de comprobantes de pago (vouchers de tarjetas, boletas de máquinas POS como Transbank, Getnet, Klap, SumUp, Mercado Pago, comprobantes de transferencias y similares), principalmente de Chile.

Tu tarea es transcribir los datos que aparecen impresos en la fotografía a los campos solicitados.

Reglas estrictas:
- No inventes ni deduzcas información que no esté impresa. Si un dato no aparece o no se lee con seguridad, deja el campo como cadena vacía "".
- Si lees un dato pero con dudas (borroso, cortado, arrugado), escríbelo y agrega el nombre del campo a "campos_dudosos".
- La imagen puede estar inclinada, rotada, con sombras o arrugada: léela en la orientación correcta.

Formato de los campos:
- fecha: AAAA-MM-DD. Los vouchers chilenos usan día/mes/año. Si el año aparece con 2 dígitos, asume 20XX.
- hora: HH:MM o HH:MM:SS en 24 horas.
- monto, propina, monto_total: solo el número, sin símbolo ni separador de miles; usa punto para decimales (ej. "12500" o "12.50"). "monto" es el monto antes de propina; "monto_total" es el total finalmente pagado. Si solo hay un total y no hay propina, pon el mismo valor en ambos.
- rut_comercio: tal como aparece, normalizado a formato 12.345.678-9 si es un RUT chileno.
- ultimos_4_digitos: solo los 4 últimos dígitos visibles de la tarjeta (ej. de "**** **** **** 1234" es "1234").
- medio_pago: por ejemplo "Tarjeta", "Efectivo", "Transferencia", "Webpay", "Billetera digital".
- tipo_tarjeta: marca, por ejemplo "Visa", "Mastercard", "American Express", "Redcompra", "Magna".
- debito_credito: "Débito", "Crédito" o "Prepago", solo si se puede determinar del voucher.
- cuotas: número de cuotas si aparece (ej. "3"); "Sin cuotas" solo si está impreso.
- moneda: código ISO (ej. "CLP", "USD"). Si los montos están en pesos chilenos ($ sin decimales en un voucher chileno), usa "CLP".
- numero_operacion, id_transaccion, numero_voucher, codigo_autorizacion, terminal, numero_comercio: cópialos exactamente, incluidos ceros a la izquierda.
- otros_datos: cualquier otro dato relevante impreso (tipo de transacción, dirección, glosas), en texto breve separado por "; ".
- es_voucher: false si la imagen claramente no es un comprobante de pago.
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
          { type: "text", text: "Extrae los datos de este comprobante." },
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
  Object.assign(data, {
    fecha: today,
    hora: "13:45",
    comercio: "Comercio de Prueba SpA",
    rut_comercio: "76.123.456-7",
    numero_operacion: String(Math.floor(Math.random() * 900000) + 100000),
    codigo_autorizacion: String(Math.floor(Math.random() * 900000) + 100000),
    monto: "12500",
    propina: "",
    monto_total: "12500",
    medio_pago: "Tarjeta",
    tipo_tarjeta: "Visa",
    ultimos_4_digitos: "4321",
    debito_credito: "Débito",
    terminal: "POS-01",
    moneda: "CLP",
  });
  return {
    data,
    dudosos: ["hora"],
    observaciones: "Lectura simulada: configure ANTHROPIC_API_KEY para leer vouchers reales.",
    es_voucher: true,
    modelo: "simulado",
    simulado: true,
  };
}

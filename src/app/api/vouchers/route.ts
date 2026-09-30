import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { requireAction } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { handle } from "@/lib/api";
import { findDuplicates } from "@/lib/duplicates";
import { applyFilters, filtersFromParams } from "@/lib/filters";
import { readImage } from "@/lib/images";
import { getStorage } from "@/lib/storage";
import { VOUCHER_FIELDS, emptyVoucher, type VoucherRecord } from "@/lib/types";

/**
 * Lista registros. Con ?todos=1 devuelve todo (para filtrar en el navegador);
 * los registros eliminados solo los ve un administrador.
 */
export const GET = handle(async (req: Request) => {
  const session = await requireAction("view");
  const params = new URL(req.url).searchParams;
  let records = await getStorage().vouchers.list();
  if (!can(session.rol, "delete")) records = records.filter((r) => r.estado !== "Eliminado");
  if (params.get("todos") !== "1") records = applyFilters(records, filtersFromParams(params));
  return NextResponse.json({ records });
});

const DataSchema = z.object(Object.fromEntries(VOUCHER_FIELDS.map((f) => [f, z.string().max(2000).optional()])));

export const POST = handle(async (req: Request) => {
  const session = await requireAction("create");
  const form = await req.formData();
  const parsed = DataSchema.safeParse(JSON.parse(String(form.get("data") ?? "{}")));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  const data = { ...emptyVoucher(), ...(parsed.data as Record<string, string>) };
  for (const f of VOUCHER_FIELDS) data[f] = (data[f] ?? "").trim();

  const storage = getStorage();
  if (form.get("confirmarDuplicado") !== "1") {
    const duplicates = findDuplicates(data, await storage.vouchers.list());
    if (duplicates.length) return NextResponse.json({ duplicates }, { status: 409 });
  }

  const id = nanoid(12);
  const photo = await readImage(form, "photo");
  const stored = await storage.photos.save(id, photo.data, photo.type);
  const now = new Date().toISOString();
  const record: VoucherRecord = {
    ...data,
    id,
    creado_en: now,
    creado_por: session.usuario,
    estado: "Registrado",
    foto_ref: stored.ref,
    foto_url: stored.url,
    actualizado_en: now,
    actualizado_por: session.usuario,
  };
  await storage.vouchers.create(record);
  return NextResponse.json({ record }, { status: 201 });
});

import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAction } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getStorage } from "@/lib/storage";
import { ESTADOS, VOUCHER_FIELDS, type VoucherRecord } from "@/lib/types";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, ctx: Ctx) => {
  await requireAction("view");
  const record = await getStorage().vouchers.get((await ctx.params).id);
  if (!record) return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  return NextResponse.json({ record });
});

const Patch = z
  .object({
    ...Object.fromEntries(VOUCHER_FIELDS.map((f) => [f, z.string().max(2000).optional()])),
    estado: z.enum(ESTADOS).optional(),
  })
  .strict();

export const PATCH = handle(async (req: Request, ctx: Ctx) => {
  const session = await requireAction("edit");
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  const record = await getStorage().vouchers.update((await ctx.params).id, {
    ...(parsed.data as Partial<VoucherRecord>),
    actualizado_en: new Date().toISOString(),
    actualizado_por: session.usuario,
  });
  if (!record) return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  return NextResponse.json({ record });
});

/** Eliminación lógica: el registro queda con estado "Eliminado" para mantener la trazabilidad. */
export const DELETE = handle(async (_req: Request, ctx: Ctx) => {
  const session = await requireAction("delete");
  const record = await getStorage().vouchers.update((await ctx.params).id, {
    estado: "Eliminado",
    actualizado_en: new Date().toISOString(),
    actualizado_por: session.usuario,
  });
  if (!record) return NextResponse.json({ error: "Registro no encontrado." }, { status: 404 });
  return NextResponse.json({ ok: true });
});

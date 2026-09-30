import { NextResponse } from "next/server";
import { requireAction } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getStorage } from "@/lib/storage";

/** Sirve la foto original solo a usuarios con sesión iniciada. */
export const GET = handle(async (_req: Request, ctx: { params: Promise<{ id: string }> }) => {
  await requireAction("view");
  const storage = getStorage();
  const record = await storage.vouchers.get((await ctx.params).id);
  if (!record?.foto_ref) return NextResponse.json({ error: "Foto no encontrada." }, { status: 404 });
  const photo = await storage.photos.read(record.foto_ref);
  if (!photo) return NextResponse.json({ error: "Foto no encontrada." }, { status: 404 });
  return new Response(new Uint8Array(photo.data), {
    headers: { "Content-Type": photo.mimeType, "Cache-Control": "private, max-age=3600" },
  });
});

import { NextResponse } from "next/server";
import { requireAction } from "@/lib/auth";
import { handle } from "@/lib/api";
import { extractVoucher } from "@/lib/extract";
import { readImage } from "@/lib/images";
import { rateLimit } from "@/lib/ratelimit";

export const maxDuration = 60;

export const POST = handle(async (req: Request) => {
  const session = await requireAction("create");
  if (!rateLimit(`extract:${session.uid}`, 60, 60 * 60_000)) {
    return NextResponse.json({ error: "Se alcanzó el límite de lecturas por hora." }, { status: 429 });
  }
  const { data, type } = await readImage(await req.formData(), "image");
  const result = await extractVoucher(data, type);
  return NextResponse.json(result);
});

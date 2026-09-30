import { NextResponse } from "next/server";
import { z } from "zod";
import { checkPassword, ensureBootstrapAdmin, startSession } from "@/lib/auth";
import { handle } from "@/lib/api";
import { rateLimit } from "@/lib/ratelimit";
import { getStorage } from "@/lib/storage";

const Body = z.object({ usuario: z.string().min(1).max(100), password: z.string().min(1).max(200) });

export const POST = handle(async (req: Request) => {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ingrese usuario y contraseña." }, { status: 400 });
  const { usuario, password } = parsed.data;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!rateLimit(`login:${ip}:${usuario.toLowerCase()}`, 10, 15 * 60_000)) {
    return NextResponse.json({ error: "Demasiados intentos. Espere unos minutos." }, { status: 429 });
  }
  await ensureBootstrapAdmin();
  const user = await getStorage().users.findByUsername(usuario);
  const ok = user && user.activo && (await checkPassword(password, user.password_hash));
  if (!user || !ok) return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  await startSession(user);
  return NextResponse.json({ ok: true });
});

import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, requireAction } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getStorage } from "@/lib/storage";
import { ROLES, type User } from "@/lib/types";

const Patch = z
  .object({
    nombre: z.string().trim().min(1).max(100).optional(),
    rol: z.enum(ROLES).optional(),
    activo: z.boolean().optional(),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(200).optional(),
  })
  .strict();

export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const session = await requireAction("manageUsers");
  const id = (await ctx.params).id;
  const parsed = Patch.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }
  if (id === session.uid && (parsed.data.activo === false || (parsed.data.rol && parsed.data.rol !== "admin"))) {
    return NextResponse.json({ error: "No puede desactivar ni quitarse el perfil de administrador a sí mismo." }, { status: 400 });
  }
  const { password, ...rest } = parsed.data;
  const patch: Partial<User> = { ...rest };
  if (password) patch.password_hash = await hashPassword(password);
  const user = await getStorage().users.update(id, patch);
  if (!user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });
  const { password_hash: _omit, ...pub } = user;
  return NextResponse.json({ user: pub });
});

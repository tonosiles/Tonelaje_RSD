import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword, newUser, requireAction } from "@/lib/auth";
import { handle } from "@/lib/api";
import { getStorage } from "@/lib/storage";
import { ROLES, type User } from "@/lib/types";

const strip = ({ password_hash: _omit, ...u }: User) => u;

export const GET = handle(async () => {
  await requireAction("manageUsers");
  return NextResponse.json({ users: (await getStorage().users.list()).map(strip) });
});

const Body = z.object({
  usuario: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, "Use solo letras, números, punto, guion o guion bajo."),
  nombre: z.string().trim().min(1).max(100),
  rol: z.enum(ROLES),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(200),
});

export const POST = handle(async (req: Request) => {
  await requireAction("manageUsers");
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos." }, { status: 400 });
  }
  const users = getStorage().users;
  if (await users.findByUsername(parsed.data.usuario)) {
    return NextResponse.json({ error: "Ese nombre de usuario ya existe." }, { status: 409 });
  }
  const user = await users.create(
    newUser({ ...parsed.data, password_hash: await hashPassword(parsed.data.password) }),
  );
  return NextResponse.json({ user: strip(user) }, { status: 201 });
});

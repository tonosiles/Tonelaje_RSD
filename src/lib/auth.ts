import "server-only";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { getStorage } from "./storage";
import { can, type Action } from "./permissions";
import { SESSION_COOKIE, SESSION_HOURS, signSession, verifySession, type SessionUser } from "./session";
import type { Role, User } from "./types";

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}

export async function startSession(user: User) {
  const token = await signSession({ uid: user.id, usuario: user.usuario, nombre: user.nombre, rol: user.rol });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Para rutas API: devuelve la sesión o lanza 401/403. */
export async function requireAction(action: Action): Promise<SessionUser> {
  const session = await getSession();
  if (!session) throw new HttpError(401, "Sesión expirada. Vuelva a iniciar sesión.");
  if (!can(session.rol, action)) throw new HttpError(403, "Su perfil no tiene permiso para esta acción.");
  return session;
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export function checkPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function newUser(input: { usuario: string; nombre: string; rol: Role; password_hash: string }): User {
  return {
    id: nanoid(12),
    usuario: input.usuario.trim().toLowerCase(),
    nombre: input.nombre.trim(),
    rol: input.rol,
    password_hash: input.password_hash,
    activo: true,
    creado_en: new Date().toISOString(),
  };
}

/** Si no existe ningún usuario, crea el administrador inicial definido en ADMIN_USERNAME / ADMIN_PASSWORD. */
export async function ensureBootstrapAdmin() {
  const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) return;
  const users = getStorage().users;
  if ((await users.list()).length > 0) return;
  await users.create(
    newUser({
      usuario: ADMIN_USERNAME,
      nombre: "Administrador",
      rol: "admin",
      password_hash: await hashPassword(ADMIN_PASSWORD),
    }),
  );
}

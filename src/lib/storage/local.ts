import { promises as fs } from "fs";
import path from "path";
import type { User, VoucherRecord } from "../types";
import type { PhotoStore, Storage, UserRepository, VoucherRepository } from "./types";

/**
 * Almacenamiento en archivos JSON locales. Pensado para desarrollo y pruebas sin
 * credenciales de Google. No usar en producción ni en hosting sin disco persistente.
 */
const DATA_DIR = process.env.LOCAL_DATA_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), ".data");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, file), "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const target = path.join(DATA_DIR, file);
  const tmp = `${target}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(value, null, 2));
  await fs.rename(tmp, target);
}

// Serializa las escrituras para evitar pisar cambios concurrentes.
let queue: Promise<unknown> = Promise.resolve();
function serialized<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.catch(() => undefined);
  return run;
}

class LocalVouchers implements VoucherRepository {
  list() {
    return readJson<VoucherRecord[]>("vouchers.json", []);
  }
  async get(id: string) {
    return (await this.list()).find((r) => r.id === id) ?? null;
  }
  create(record: VoucherRecord) {
    return serialized(async () => {
      const all = await this.list();
      all.push(record);
      await writeJson("vouchers.json", all);
      return record;
    });
  }
  update(id: string, patch: Partial<VoucherRecord>) {
    return serialized(async () => {
      const all = await this.list();
      const i = all.findIndex((r) => r.id === id);
      if (i < 0) return null;
      all[i] = { ...all[i], ...patch, id };
      await writeJson("vouchers.json", all);
      return all[i];
    });
  }
}

class LocalUsers implements UserRepository {
  list() {
    return readJson<User[]>("users.json", []);
  }
  async findByUsername(usuario: string) {
    const u = usuario.trim().toLowerCase();
    return (await this.list()).find((x) => x.usuario.toLowerCase() === u) ?? null;
  }
  create(user: User) {
    return serialized(async () => {
      const all = await this.list();
      all.push(user);
      await writeJson("users.json", all);
      return user;
    });
  }
  update(id: string, patch: Partial<User>) {
    return serialized(async () => {
      const all = await this.list();
      const i = all.findIndex((r) => r.id === id);
      if (i < 0) return null;
      all[i] = { ...all[i], ...patch, id };
      await writeJson("users.json", all);
      return all[i];
    });
  }
}

class LocalPhotos implements PhotoStore {
  async save(id: string, data: Buffer, mimeType: string) {
    const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
    const name = `${id}.${ext}`;
    await fs.mkdir(path.join(DATA_DIR, "photos"), { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, "photos", name), data);
    return { ref: `local:${name}`, url: `/api/photos/${id}` };
  }
  async read(ref: string) {
    if (!ref.startsWith("local:")) return null;
    const name = path.basename(ref.slice("local:".length));
    try {
      const data = await fs.readFile(path.join(DATA_DIR, "photos", name));
      const mimeType = name.endsWith(".png") ? "image/png" : name.endsWith(".webp") ? "image/webp" : "image/jpeg";
      return { data, mimeType };
    } catch {
      return null;
    }
  }
}

export function createLocalStorage(): Storage {
  return { vouchers: new LocalVouchers(), users: new LocalUsers(), photos: new LocalPhotos(), backend: "local" };
}

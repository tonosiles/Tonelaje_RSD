import type { User, VoucherRecord } from "../types";

/**
 * Interfaces de almacenamiento. La app solo depende de estas interfaces, así que
 * reemplazar Google Sheets por PostgreSQL o Supabase consiste en escribir una nueva
 * implementación y registrarla en ./index.ts.
 */
export interface VoucherRepository {
  list(): Promise<VoucherRecord[]>;
  get(id: string): Promise<VoucherRecord | null>;
  create(record: VoucherRecord): Promise<VoucherRecord>;
  update(id: string, patch: Partial<VoucherRecord>): Promise<VoucherRecord | null>;
}

export interface UserRepository {
  list(): Promise<User[]>;
  findByUsername(usuario: string): Promise<User | null>;
  create(user: User): Promise<User>;
  update(id: string, patch: Partial<User>): Promise<User | null>;
}

export interface StoredPhoto {
  ref: string; // referencia interna, p. ej. "local:abc.jpg" o "drive:<fileId>"
  url: string; // enlace para abrir la foto (en Drive: webViewLink)
}

export interface PhotoStore {
  save(id: string, data: Buffer, mimeType: string): Promise<StoredPhoto>;
  read(ref: string): Promise<{ data: Buffer; mimeType: string } | null>;
}

export interface Storage {
  vouchers: VoucherRepository;
  users: UserRepository;
  photos: PhotoStore;
  backend: string;
}

import { google, sheets_v4 } from "googleapis";
import { Readable } from "stream";
import { VOUCHER_FIELDS, type User, type VoucherRecord } from "../types";
import { FIELD_LABELS } from "../fields";
import { parseAmount } from "../format";
import { googleAuth } from "./google";
import type { PhotoStore, Storage, UserRepository, VoucherRepository } from "./types";

/**
 * Implementación sobre Google Sheets: una hoja "Vouchers" (una fila por voucher) y una
 * hoja "Usuarios". La primera fila de cada hoja son los encabezados; se crean solos.
 */

type Column<T> = { key: keyof T & string; label: string; kind?: "number" | "boolean" };

const VOUCHER_COLUMNS: Column<VoucherRecord>[] = [
  { key: "id", label: "ID registro" },
  { key: "creado_en", label: "Fecha y hora de carga" },
  { key: "creado_por", label: "Usuario que cargó" },
  { key: "estado", label: "Estado" },
  ...VOUCHER_FIELDS.map((f) => ({
    key: f,
    label: FIELD_LABELS[f],
    kind: f === "monto" || f === "propina" || f === "monto_total" ? ("number" as const) : undefined,
  })),
  { key: "foto_url", label: "Foto original" },
  { key: "foto_ref", label: "Referencia foto" },
  { key: "actualizado_en", label: "Última modificación" },
  { key: "actualizado_por", label: "Modificado por" },
];

const USER_COLUMNS: Column<User>[] = [
  { key: "id", label: "ID" },
  { key: "usuario", label: "Usuario" },
  { key: "nombre", label: "Nombre" },
  { key: "rol", label: "Rol" },
  { key: "activo", label: "Activo", kind: "boolean" },
  { key: "creado_en", label: "Creado en" },
  { key: "password_hash", label: "Contraseña (hash)" },
];

function colLetter(n: number): string {
  let s = "";
  for (n = n + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

class SheetTable<T extends { id: string }> {
  private ready: Promise<void> | null = null;
  constructor(
    private api: sheets_v4.Sheets,
    private spreadsheetId: string,
    private sheet: string,
    private columns: Column<T>[],
  ) {}

  private get lastCol() {
    return colLetter(this.columns.length - 1);
  }

  /** Crea la hoja y los encabezados si no existen. */
  private ensure() {
    this.ready ??= (async () => {
      const meta = await this.api.spreadsheets.get({ spreadsheetId: this.spreadsheetId, fields: "sheets.properties.title" });
      const exists = meta.data.sheets?.some((s) => s.properties?.title === this.sheet);
      if (!exists) {
        await this.api.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [
              { addSheet: { properties: { title: this.sheet, gridProperties: { frozenRowCount: 1 } } } },
            ],
          },
        });
      }
      const head = await this.api.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `'${this.sheet}'!A1:${this.lastCol}1`,
      });
      if (!head.data.values?.[0]?.length) {
        await this.api.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `'${this.sheet}'!A1`,
          valueInputOption: "RAW",
          requestBody: { values: [this.columns.map((c) => c.label)] },
        });
      }
    })().catch((e) => {
      this.ready = null;
      throw e;
    });
    return this.ready;
  }

  private toRow(item: T): (string | number | boolean)[] {
    return this.columns.map((c) => {
      const v = item[c.key] as unknown;
      if (c.kind === "number") return parseAmount(v as string) ?? (v as string) ?? "";
      if (c.kind === "boolean") return Boolean(v);
      return v === undefined || v === null ? "" : String(v);
    });
  }

  private fromRow(header: string[], row: unknown[]): T {
    const obj: Record<string, unknown> = {};
    for (const c of this.columns) {
      let i = header.indexOf(c.label);
      if (i < 0) i = header.indexOf(c.key);
      const v = i >= 0 ? row[i] : undefined;
      if (c.kind === "boolean") obj[c.key] = v === true || v === "TRUE" || v === "true";
      else obj[c.key] = v === undefined || v === null ? "" : String(v);
    }
    return obj as T;
  }

  private async readAll(): Promise<{ header: string[]; rows: unknown[][] }> {
    await this.ensure();
    const res = await this.api.spreadsheets.values.get({
      spreadsheetId: this.spreadsheetId,
      range: `'${this.sheet}'!A:${this.lastCol}`,
      valueRenderOption: "UNFORMATTED_VALUE",
    });
    const [header = [], ...rows] = (res.data.values ?? []) as unknown[][];
    return { header: header.map(String), rows };
  }

  async list(): Promise<T[]> {
    const { header, rows } = await this.readAll();
    return rows.filter((r) => r.some((c) => c !== "")).map((r) => this.fromRow(header, r));
  }

  async append(item: T): Promise<T> {
    await this.ensure();
    await this.api.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: `'${this.sheet}'!A:${this.lastCol}`,
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: [this.toRow(item)] },
    });
    return item;
  }

  async update(id: string, patch: Partial<T>): Promise<T | null> {
    const { header, rows } = await this.readAll();
    const idCol = Math.max(0, header.indexOf(this.columns[0].label));
    const i = rows.findIndex((r) => String(r[idCol] ?? "") === id);
    if (i < 0) return null;
    const next = { ...this.fromRow(header, rows[i]), ...patch, id } as T;
    const rowNumber = i + 2; // +1 por encabezado, +1 por índice base 1
    await this.api.spreadsheets.values.update({
      spreadsheetId: this.spreadsheetId,
      range: `'${this.sheet}'!A${rowNumber}:${this.lastCol}${rowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [this.toRow(next)] },
    });
    return next;
  }
}

class SheetVouchers implements VoucherRepository {
  constructor(private table: SheetTable<VoucherRecord>) {}
  list() {
    return this.table.list();
  }
  async get(id: string) {
    return (await this.list()).find((r) => r.id === id) ?? null;
  }
  create(r: VoucherRecord) {
    return this.table.append(r);
  }
  update(id: string, patch: Partial<VoucherRecord>) {
    return this.table.update(id, patch);
  }
}

class SheetUsers implements UserRepository {
  constructor(private table: SheetTable<User>) {}
  async list() {
    return (await this.table.list()).map((u) => ({ ...u, activo: u.activo !== false }));
  }
  async findByUsername(usuario: string) {
    const u = usuario.trim().toLowerCase();
    return (await this.list()).find((x) => x.usuario.toLowerCase() === u) ?? null;
  }
  create(user: User) {
    return this.table.append(user);
  }
  update(id: string, patch: Partial<User>) {
    return this.table.update(id, patch);
  }
}

/**
 * Fotos en Google Drive. Con el permiso "drive.file" la app solo puede usar carpetas que
 * ella misma creó, así que, si no se indica GOOGLE_DRIVE_FOLDER_ID, busca o crea su propia
 * carpeta (por defecto "Vouchers - fotos (app)") en el Drive de la cuenta conectada.
 */
class DrivePhotos implements PhotoStore {
  private drive = google.drive({ version: "v3", auth: googleAuth() });
  private folder: Promise<string> | null = null;
  constructor(
    private folderId: string | undefined,
    private folderName: string,
  ) {}

  private resolveFolder(): Promise<string> {
    if (this.folderId) return Promise.resolve(this.folderId);
    this.folder ??= (async () => {
      const name = this.folderName.replace(/'/g, "\\'");
      const found = await this.drive.files.list({
        q: `mimeType = 'application/vnd.google-apps.folder' and name = '${name}' and trashed = false`,
        fields: "files(id)",
        pageSize: 1,
      });
      const existing = found.data.files?.[0]?.id;
      if (existing) return existing;
      const created = await this.drive.files.create({
        requestBody: { name: this.folderName, mimeType: "application/vnd.google-apps.folder" },
        fields: "id",
      });
      return created.data.id!;
    })().catch((e) => {
      this.folder = null;
      throw e;
    });
    return this.folder;
  }

  async save(id: string, data: Buffer, mimeType: string) {
    const ext = mimeType === "image/png" ? "png" : "jpg";
    const folderId = await this.resolveFolder();
    const res = await this.drive.files.create({
      requestBody: { name: `voucher-${id}.${ext}`, parents: [folderId] },
      media: { mimeType, body: Readable.from(data) },
      fields: "id, webViewLink",
      supportsAllDrives: true,
    });
    return { ref: `drive:${res.data.id}`, url: res.data.webViewLink ?? `https://drive.google.com/file/d/${res.data.id}/view` };
  }

  async read(ref: string) {
    if (!ref.startsWith("drive:")) return null;
    const fileId = ref.slice("drive:".length);
    const meta = await this.drive.files.get({ fileId, fields: "mimeType", supportsAllDrives: true });
    const res = await this.drive.files.get({ fileId, alt: "media", supportsAllDrives: true }, { responseType: "arraybuffer" });
    return { data: Buffer.from(res.data as ArrayBuffer), mimeType: meta.data.mimeType ?? "image/jpeg" };
  }
}

export function createSheetsStorage(): Storage {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) throw new Error("Falta GOOGLE_SHEETS_ID (el ID de la planilla, que aparece en su URL).");
  const api = google.sheets({ version: "v4", auth: googleAuth() });
  return {
    vouchers: new SheetVouchers(new SheetTable(api, spreadsheetId, "Vouchers", VOUCHER_COLUMNS)),
    users: new SheetUsers(new SheetTable(api, spreadsheetId, "Usuarios", USER_COLUMNS)),
    photos: new DrivePhotos(
      process.env.GOOGLE_DRIVE_FOLDER_ID,
      process.env.GOOGLE_DRIVE_FOLDER_NAME || "Vouchers - fotos (app)",
    ),
    backend: "sheets",
  };
}

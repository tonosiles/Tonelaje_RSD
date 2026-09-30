import "server-only";
import { createLocalStorage } from "./local";
import { createSheetsStorage } from "./sheets";
import type { Storage } from "./types";

/**
 * Punto único de acceso al almacenamiento. Para migrar a PostgreSQL/Supabase:
 * crear ./postgres.ts que implemente `Storage` y agregar el caso aquí.
 */
let instance: Storage | null = null;

export function getStorage(): Storage {
  if (instance) return instance;
  const backend = (process.env.STORAGE_BACKEND || (process.env.GOOGLE_SHEETS_ID ? "sheets" : "local")).toLowerCase();
  switch (backend) {
    case "sheets":
      instance = createSheetsStorage();
      break;
    case "local":
      instance = createLocalStorage();
      break;
    default:
      throw new Error(`STORAGE_BACKEND desconocido: ${backend}`);
  }
  return instance;
}

export type { Storage } from "./types";

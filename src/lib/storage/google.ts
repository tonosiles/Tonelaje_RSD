import { google } from "googleapis";

/**
 * Autenticación con Google. Dos opciones:
 *  1. OAuth de una cuenta Google (recomendado para cuentas @gmail.com, porque permite
 *     subir fotos a Drive): GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET,
 *     GOOGLE_OAUTH_REFRESH_TOKEN (se obtiene con `npm run google-auth`).
 *  2. Cuenta de servicio: GOOGLE_SERVICE_ACCOUNT_JSON (JSON completo o en base64).
 *     Sirve para Sheets; para Drive requiere una unidad compartida de Google Workspace.
 */
let cached: InstanceType<typeof google.auth.OAuth2> | InstanceType<typeof google.auth.GoogleAuth> | null = null;

/** Quita espacios y comillas que suelen colarse al pegar valores en el panel del hosting. */
export function env(name: string): string | undefined {
  const v = process.env[name]?.trim().replace(/^["']|["']$/g, "").trim();
  return v || undefined;
}

export function googleAuth() {
  if (cached) return cached;
  const GOOGLE_OAUTH_CLIENT_ID = env("GOOGLE_OAUTH_CLIENT_ID");
  const GOOGLE_OAUTH_CLIENT_SECRET = env("GOOGLE_OAUTH_CLIENT_SECRET");
  const GOOGLE_OAUTH_REFRESH_TOKEN = env("GOOGLE_OAUTH_REFRESH_TOKEN");
  const GOOGLE_SERVICE_ACCOUNT_JSON = env("GOOGLE_SERVICE_ACCOUNT_JSON");
  if (GOOGLE_OAUTH_CLIENT_ID && GOOGLE_OAUTH_CLIENT_SECRET && GOOGLE_OAUTH_REFRESH_TOKEN) {
    const client = new google.auth.OAuth2(GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET);
    client.setCredentials({ refresh_token: GOOGLE_OAUTH_REFRESH_TOKEN });
    cached = client;
  } else if (GOOGLE_SERVICE_ACCOUNT_JSON) {
    const raw = GOOGLE_SERVICE_ACCOUNT_JSON.trim().startsWith("{")
      ? GOOGLE_SERVICE_ACCOUNT_JSON
      : Buffer.from(GOOGLE_SERVICE_ACCOUNT_JSON, "base64").toString("utf8");
    cached = new google.auth.GoogleAuth({
      credentials: JSON.parse(raw),
      scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"],
    });
  } else {
    throw new Error(
      "Faltan credenciales de Google: configure GOOGLE_OAUTH_* o GOOGLE_SERVICE_ACCOUNT_JSON en las variables de entorno.",
    );
  }
  return cached;
}

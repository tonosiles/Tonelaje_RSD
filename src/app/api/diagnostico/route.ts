import { NextResponse } from "next/server";
import { google } from "googleapis";
import { env } from "@/lib/storage/google";

export const dynamic = "force-dynamic";

/** Muestra solo los últimos 4 caracteres de un valor secreto. */
const tail = (v?: string) => (v ? `…${v.slice(-4)} (${v.length} caracteres)` : "NO CONFIGURADO");

/**
 * Diagnóstico de configuración, accesible sin sesión para poder revisar la conexión
 * con Google cuando el inicio de sesión falla. No muestra ningún valor secreto completo.
 */
export async function GET() {
  const clientId = env("GOOGLE_OAUTH_CLIENT_ID");
  const secret = env("GOOGLE_OAUTH_CLIENT_SECRET");
  const refresh = env("GOOGLE_OAUTH_REFRESH_TOKEN");
  const sheetId = env("GOOGLE_SHEETS_ID");

  const checks: Record<string, unknown> = {
    "ID de cliente": clientId ?? "NO CONFIGURADO",
    "ID de cliente con formato correcto": !!clientId?.endsWith(".apps.googleusercontent.com"),
    "Secreto": tail(secret),
    "Secreto empieza con GOCSPX-": !!secret?.startsWith("GOCSPX-"),
    "Refresh token": tail(refresh),
    "Refresh token empieza con 1//": !!refresh?.startsWith("1//"),
    "ID de planilla": sheetId ?? "NO CONFIGURADO",
    "Clave de Anthropic configurada": !!env("ANTHROPIC_API_KEY")?.startsWith("sk-ant-"),
    "SESSION_SECRET suficiente (32+)": (env("SESSION_SECRET")?.length ?? 0) >= 32,
    "Usuario administrador inicial": env("ADMIN_USERNAME") ?? "NO CONFIGURADO",
    "Contraseña administrador configurada": !!env("ADMIN_PASSWORD"),
  };

  if (clientId && secret && refresh) {
    const client = new google.auth.OAuth2(clientId, secret);
    client.setCredentials({ refresh_token: refresh });
    try {
      await client.getAccessToken();
      checks["Conexión con Google"] = "OK";
      if (sheetId) {
        try {
          const sheets = google.sheets({ version: "v4", auth: client });
          const res = await sheets.spreadsheets.get({ spreadsheetId: sheetId, fields: "properties.title" });
          checks["Acceso a la planilla"] = `OK: "${res.data.properties?.title}"`;
        } catch (e) {
          checks["Acceso a la planilla"] = `ERROR: ${googleError(e)}`;
        }
      }
    } catch (e) {
      checks["Conexión con Google"] = `ERROR: ${googleError(e)}`;
    }
  }
  return NextResponse.json(checks, { headers: { "Cache-Control": "no-store" } });
}

function googleError(e: unknown): string {
  const err = e as { response?: { data?: { error?: string | { message?: string }; error_description?: string } }; message?: string };
  const data = err.response?.data;
  if (data) {
    const code = typeof data.error === "string" ? data.error : data.error?.message;
    return [code, data.error_description].filter(Boolean).join(" - ");
  }
  return err.message ?? String(e);
}

// Obtiene el GOOGLE_OAUTH_REFRESH_TOKEN para que la app escriba en Google Sheets y suba
// fotos a Google Drive con su cuenta de Google.
// Uso: GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... npm run google-auth
import http from "node:http";
import { google } from "googleapis";

const { GOOGLE_OAUTH_CLIENT_ID: id, GOOGLE_OAUTH_CLIENT_SECRET: secret } = process.env;
if (!id || !secret) {
  console.error("Defina GOOGLE_OAUTH_CLIENT_ID y GOOGLE_OAUTH_CLIENT_SECRET antes de ejecutar.");
  process.exit(1);
}
const PORT = 53682;
const client = new google.auth.OAuth2(id, secret, `http://127.0.0.1:${PORT}`);
const url = client.generateAuthUrl({
  access_type: "offline",
  prompt: "consent",
  scope: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"],
});

http
  .createServer(async (req, res) => {
    const code = new URL(req.url, `http://127.0.0.1:${PORT}`).searchParams.get("code");
    if (!code) return res.end("Sin código");
    const { tokens } = await client.getToken(code);
    res.end("Listo. Puede cerrar esta ventana y volver a la terminal.");
    console.log("\nGOOGLE_OAUTH_REFRESH_TOKEN=" + tokens.refresh_token + "\n");
    process.exit(0);
  })
  .listen(PORT, () => console.log("Abra este enlace en el navegador e inicie sesión con la cuenta dueña de la planilla:\n\n" + url));

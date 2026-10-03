# Vouchers — digitalización de tickets de pesaje

Aplicación web (optimizada para celulares) que fotografía tickets de pesaje de báscula
(recepción de carga: folio, patente, chofer, origen, pesos de entrada, salida y neto), los lee con IA
(Claude, visión), permite revisar y corregir los datos y los guarda en Google Sheets.

## Funciones del MVP

1. **Inicio de sesión** con usuario y contraseña, y perfiles: Administrador, Usuario y Consulta.
2. **Captura**: cámara del teléfono o imagen existente.
3. **Mejora automática de la imagen** en el navegador: orientación, recorte, corrección de
   perspectiva, eliminación de sombras y contraste (`src/lib/preprocess.ts`).
4. **Lectura con IA** a JSON estructurado; no inventa datos: lo que no se lee queda vacío
   ("No identificado") y lo dudoso se marca "Verificar" (`src/lib/extract.ts`).
5. **Revisar información**: todos los campos editables, con "Guardar" y "Volver a escanear".
6. **Control de duplicados** antes de guardar (fecha, monto, código de autorización,
   número de operación, últimos 4 dígitos) (`src/lib/duplicates.ts`).
7. **Guardado en Google Sheets** (una fila por voucher) y foto original en Google Drive.
   Se agregan fecha/hora de carga, usuario, ID único, estado y enlace a la foto.
8. **Historial** con tabla, búsqueda general, filtros, detalle con foto y exportación a Excel/CSV.
9. **Dashboard** con totales, registros de hoy y del mes, por usuario, por comercio y evolución por fecha.

| Acción | Administrador | Usuario | Consulta |
|---|---|---|---|
| Ver historial, dashboard y exportar | ✓ | ✓ | ✓ |
| Escanear y guardar vouchers | ✓ | ✓ | |
| Editar, cambiar estado, eliminar | ✓ | | |
| Administrar usuarios | ✓ | | |

"Eliminar" marca el registro como *Eliminado* (no borra la fila) para mantener la trazabilidad.

## Arquitectura

- Next.js 16 (App Router) + Tailwind. Todo el acceso a datos pasa por las interfaces de
  `src/lib/storage/types.ts` (`VoucherRepository`, `UserRepository`, `PhotoStore`).
- Implementaciones: `sheets.ts` (Google Sheets + Drive) y `local.ts` (archivos JSON, para pruebas).
- **Migrar a PostgreSQL/Supabase**: crear `src/lib/storage/postgres.ts` que implemente `Storage`
  y agregarlo en `src/lib/storage/index.ts`. El resto de la app no cambia.
- Las fotos se sirven a través de `/api/photos/:id`, solo a usuarios con sesión.

## Probar localmente (sin credenciales)

```bash
npm install
cp .env.example .env.local   # complete SESSION_SECRET y ADMIN_PASSWORD
echo "STORAGE_BACKEND=local" >> .env.local
npm run dev
```

Sin `ANTHROPIC_API_KEY` la lectura devuelve datos simulados, para probar el flujo completo.

## Configurar Google Sheets y Drive

Todo se hace desde el navegador, con la cuenta de Google que será dueña de los datos.

1. Cree una planilla vacía y copie su ID (entre `/d/` y `/edit` en la URL) en `GOOGLE_SHEETS_ID`.
   La app crea sola las hojas **Tickets** (una fila por ticket de pesaje) y **Usuarios** con sus encabezados.
2. En [Google Cloud Console](https://console.cloud.google.com/) cree un proyecto y, en
   *APIs y servicios → Biblioteca*, habilite **Google Sheets API** y **Google Drive API**.
3. En *Google Auth Platform* (pantalla de consentimiento OAuth): tipo de público **Externo**;
   luego, en *Público*, pulse **Publicar app** (en modo Prueba el permiso vence a los 7 días).
4. En *Clientes*, cree un cliente OAuth de tipo **Aplicación web** con el URI de redireccionamiento
   `https://developers.google.com/oauthplayground`. Copie el ID y el secreto en
   `GOOGLE_OAUTH_CLIENT_ID` y `GOOGLE_OAUTH_CLIENT_SECRET`.
5. Abra [OAuth Playground](https://developers.google.com/oauthplayground), pulse el engranaje,
   marque *Use your own OAuth credentials* y pegue el ID y el secreto. En *Input your own scopes* escriba
   `https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file`,
   pulse **Authorize APIs**, acepte (si Google advierte que la app no está verificada: *Configuración
   avanzada → Ir a…*), y luego **Exchange authorization code for tokens**. Copie el *Refresh token*
   en `GOOGLE_OAUTH_REFRESH_TOKEN`.

   Alternativa por terminal: `GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... npm run google-auth`
   (con un cliente de tipo *Aplicación de escritorio*).

Las fotos se guardan en la carpeta **Vouchers - fotos (app)**, que la app crea sola en su Drive
(con el permiso `drive.file` la app solo accede a lo que ella misma crea, no al resto de su Drive).

La hoja **Usuarios** guarda las contraseñas como hash (bcrypt). Conviene no compartir esa hoja
con editores que no sean administradores.

## Despliegue (recomendado: Vercel)

1. Suba el repositorio a GitHub e impórtelo en Vercel.
2. Configure las variables de `.env.example` en *Settings → Environment Variables*.
3. Inicie sesión con `ADMIN_USERNAME` / `ADMIN_PASSWORD` y cree los demás usuarios en **Usuarios**.

En el teléfono, "Agregar a pantalla de inicio" deja la app como un ícono más.

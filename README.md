# Vouchers — digitalización de comprobantes de pago

Aplicación web (optimizada para celulares) que fotografía vouchers, los lee con IA
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

1. Cree una planilla de Google Sheets vacía y copie su ID (entre `/d/` y `/edit` en la URL)
   en `GOOGLE_SHEETS_ID`. La app crea sola las hojas **Vouchers** y **Usuarios** con sus encabezados.
2. Cree una carpeta en Google Drive para las fotos y copie su ID en `GOOGLE_DRIVE_FOLDER_ID`.
3. En [Google Cloud Console](https://console.cloud.google.com/): cree un proyecto, habilite
   **Google Sheets API** y **Google Drive API**, configure la pantalla de consentimiento OAuth
   (tipo *Externo*, agréguese como usuario de prueba) y cree una credencial
   **ID de cliente OAuth → Aplicación de escritorio**.
4. Obtenga el refresh token (en su computador):
   ```bash
   GOOGLE_OAUTH_CLIENT_ID=... GOOGLE_OAUTH_CLIENT_SECRET=... npm run google-auth
   ```
   Copie el valor impreso en `GOOGLE_OAUTH_REFRESH_TOKEN`.

   Mientras la app OAuth esté en modo *Prueba*, Google vence el refresh token a los 7 días;
   publique la app (no requiere verificación para uso propio) para que no expire.

La hoja **Usuarios** guarda las contraseñas como hash (bcrypt). Conviene no compartir esa hoja
con editores que no sean administradores.

## Despliegue (recomendado: Vercel)

1. Suba el repositorio a GitHub e impórtelo en Vercel.
2. Configure las variables de `.env.example` en *Settings → Environment Variables*.
3. Inicie sesión con `ADMIN_USERNAME` / `ADMIN_PASSWORD` y cree los demás usuarios en **Usuarios**.

En el teléfono, "Agregar a pantalla de inicio" deja la app como un ícono más.

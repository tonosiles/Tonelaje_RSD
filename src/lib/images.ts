import "server-only";
import { HttpError } from "./auth";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export type ImageType = "image/jpeg" | "image/png" | "image/webp";

/** Lee y valida una imagen de un formulario multipart (tipo real verificado por firma). */
export async function readImage(form: FormData, field: string): Promise<{ data: Buffer; type: ImageType }> {
  const file = form.get(field);
  if (!(file instanceof File) || file.size === 0) throw new HttpError(400, "No se recibió la imagen.");
  if (file.size > MAX_IMAGE_BYTES) throw new HttpError(413, "La imagen es demasiado grande (máximo 8 MB).");
  const data = Buffer.from(await file.arrayBuffer());
  const type = sniff(data);
  if (!type) throw new HttpError(415, "Formato no soportado. Use JPG, PNG o WebP.");
  return { data, type };
}

function sniff(b: Buffer): ImageType | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  return null;
}

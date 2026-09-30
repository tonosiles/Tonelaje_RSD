import "server-only";
import { NextResponse } from "next/server";
import { HttpError } from "./auth";

/** Envuelve un handler de ruta API y convierte errores en respuestas JSON en español. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message }, { status: e.status });
      console.error(e);
      const message = e instanceof Error ? e.message : "Error inesperado";
      return NextResponse.json({ error: `Error del servidor: ${message}` }, { status: 500 });
    }
  };
}

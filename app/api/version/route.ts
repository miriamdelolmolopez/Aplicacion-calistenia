import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// La versión que hay publicada ahora. La app instalada en el móvil la compara con la suya para saber si tiene que recargarse.
export function GET() {
  return NextResponse.json({ build: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev" }, { headers: { "Cache-Control": "no-store" } });
}

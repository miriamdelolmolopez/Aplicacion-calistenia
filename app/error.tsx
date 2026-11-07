"use client";

import PantallaError from "./PantallaError";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PantallaError tipo="error" reintentar={reset} detalle={[error?.message, error?.digest].filter(Boolean).join(" · ").slice(0, 160)} />;
}

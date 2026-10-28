"use client";

import PantallaError from "./PantallaError";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <PantallaError tipo="error" reintentar={reset} />;
}

// Iconos pequeños del diseño (trazo fino). Solo decoran: el texto siempre va al lado.
const base = { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

export function IconoReloj({ tamano = 14 }: { tamano?: number }) {
  return (
    <svg {...base} width={tamano} height={tamano}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function IconoCorona({ tamano = 14 }: { tamano?: number }) {
  return (
    <svg {...base} width={tamano} height={tamano}>
      <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14" />
    </svg>
  );
}

export function IconoFlecha({ tamano = 18 }: { tamano?: number }) {
  return (
    <svg {...base} width={tamano} height={tamano} strokeWidth={2.5}>
      <line x1="7" y1="17" x2="17" y2="7" />
      <polyline points="7 7 17 7 17 17" />
    </svg>
  );
}

export function IconoDedo({ tamano = 20 }: { tamano?: number }) {
  return (
    <svg {...base} width={tamano} height={tamano} strokeWidth={2}>
      <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-5-2.7L4 15.5a1.5 1.5 0 0 1 2.4-1.8L9 16" />
    </svg>
  );
}

// Iconos pequeños para los botones de la tarjeta de cada persona.
const base = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };

export const IconoEuro = () => (
  <svg {...base}>
    <path d="M18 7a7 7 0 1 0 0 10" />
    <path d="M4 10h9M4 14h9" />
  </svg>
);
export const IconoCalendario = () => (
  <svg {...base}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </svg>
);
export const IconoLapiz = () => (
  <svg {...base}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);
export const IconoInfo = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
export const IconoMas = () => (
  <svg {...base}>
    <circle cx="5" cy="12" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="19" cy="12" r="1" />
  </svg>
);
export const IconoMarcador = () => (
  <svg {...base} width={16} height={16}>
    <path d="M6 3h12v18l-6-4-6 4z" />
  </svg>
);

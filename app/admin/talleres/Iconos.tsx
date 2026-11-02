// Iconos sencillos (línea) para los botones de los talleres. Heredan el color del texto.
function Base({ children }: { children: React.ReactNode }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const IconoPerfil = () => (
  <Base>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" />
  </Base>
);

export const IconoCopiar = () => (
  <Base>
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V6a2 2 0 0 1 2-2h9" />
  </Base>
);

export const IconoCompartir = () => (
  <Base>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4" />
  </Base>
);

export const IconoCalendario = () => (
  <Base>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </Base>
);

export const IconoLapiz = () => (
  <Base>
    <path d="M4 20l1-4L16.5 4.5a2 2 0 0 1 3 3L8 19z" />
    <path d="M14 7l3 3" />
  </Base>
);

export const IconoPapelera = () => (
  <Base>
    <path d="M4 7h16M10 11v6M14 11v6" />
    <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
    <path d="M9 7V4h6v3" />
  </Base>
);

export const IconoCheck = () => (
  <Base>
    <path d="M5 13l4 4L19 7" />
  </Base>
);

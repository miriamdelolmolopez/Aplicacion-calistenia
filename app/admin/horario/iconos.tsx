// Iconos pequeños de las tarjetas del horario.
type P = { color: string; titulo: string };

export function IconoUsuario({ color, titulo }: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color} role="img" aria-label={titulo}>
      <title>{titulo}</title>
      <circle cx="12" cy="7.5" r="4.2" />
      <path d="M3.5 21c0-4.6 3.8-7.4 8.5-7.4s8.5 2.8 8.5 7.4z" />
    </svg>
  );
}

export function IconoProhibido({ color, titulo }: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" role="img" aria-label={titulo}>
      <title>{titulo}</title>
      <circle cx="12" cy="12" r="9" />
      <path d="M5.6 18.4 18.4 5.6" />
    </svg>
  );
}

export function IconoArena({ color, titulo }: P) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color} role="img" aria-label={titulo}>
      <title>{titulo}</title>
      <path d="M6 2h12v2h-1.2c0 3-1.8 4.7-3.6 6 1.8 1.3 3.6 3 3.6 6H18v2H6v-2h1.2c0-3 1.8-4.7 3.6-6C9 8.7 7.2 7 7.2 4H6z" />
    </svg>
  );
}

export function IconoLapiz({ titulo }: { titulo: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label={titulo}>
      <title>{titulo}</title>
      <path d="M3 17.3V21h3.7L18.8 8.9l-3.7-3.7zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7z" />
    </svg>
  );
}

export function IconoPapelera({ titulo }: { titulo: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" role="img" aria-label={titulo}>
      <title>{titulo}</title>
      <path d="M6 7h12l-1 14H7zM9 3h6l1 2h4v2H4V5h4z" />
    </svg>
  );
}

// Iconos sencillos de trazo, en el color del texto que los rodea.
const DIBUJOS = {
  inicio: (
    <>
      <path d="M3 11 12 3l9 8" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  reservar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  rutina: <path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12" />,
  progreso: (
    <>
      <path d="M12 21v-9" />
      <path d="M12 12c0-4-3-6-7-6 0 4 3 6 7 6Z" />
      <path d="M12 14c0-3 2-5 6-5 0 3-2 5-6 5Z" />
    </>
  ),
  cuenta: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  admin: <path d="M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6Z" />,
  salir: <path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  cerrar: <path d="M6 6l12 12M18 6 6 18" />,
} as const;

export type NombreIcono = keyof typeof DIBUJOS;

export default function Icono({ nombre, tamano = 22 }: { nombre: NombreIcono; tamano?: number }) {
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {DIBUJOS[nombre]}
    </svg>
  );
}

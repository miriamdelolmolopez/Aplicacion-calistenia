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
  reservas: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M9 16l2 2 4-4" />
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
  perfil: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  pagos: (
    <>
      <rect x="2" y="6" width="20" height="13" rx="2" />
      <path d="M2 11h20M6 16h4" />
    </>
  ),
  ajustes: (
    <>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  admin: <path d="M12 3 4 6v6c0 5 4 8 8 9 4-1 8-4 8-9V6Z" />,
  salir: <path d="M9 21H5V3h4M16 17l5-5-5-5M21 12H9" />,
  usuarios: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" />
      <path d="M16 4.7a3.5 3.5 0 0 1 0 6.6M18 14.8c2 .7 3.5 2.3 3.5 5.2" />
    </>
  ),
  mas: (
    <>
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="19" cy="12" r="1.2" />
    </>
  ),
  saber: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" />
      <path d="M4 21V5M9 8h6" />
    </>
  ),
  aprende: (
    <>
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" />
      <path d="M4 21V5M9 8h6M9 12h6" />
    </>
  ),
  lupa: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  historial: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  metricas: <path d="M5 21V11M12 21V4M19 21v-7" />,
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

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
  biblioteca: (
    <>
      <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
    </>
  ),
  academia: (
    <>
      <path d="m2 9 10-5 10 5-10 5Z" />
      <path d="M6 11.5V16c0 1.5 3 3 6 3s6-1.5 6-3v-4.5M22 9v6" />
    </>
  ),
  ayuda: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 1-1 1.7M12 17h.01" />
    </>
  ),
  tablon: (
    <>
      <rect x="3" y="4" width="18" height="15" rx="2" />
      <path d="M7 9h6M7 13h10M12 19v2M8 21h8" />
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
  embudo: <path d="M3 5h18l-7 8v6l-4 2v-8L3 5Z" />,
  // Iconos suaves que sustituyen a los emoticonos de la app
  regalo: <path d="M20 12v9H4v-9M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 1 1 0-5C11 2 12 7 12 7ZM12 7h4.5a2.5 2.5 0 1 0 0-5C13 2 12 7 12 7Z" />,
  relojArena: <path d="M6 2h12M6 22h12M7 2v4a5 5 0 0 0 2.5 4.3L12 12l-2.5 1.7A5 5 0 0 0 7 18v4M17 2v4a5 5 0 0 1-2.5 4.3L12 12l2.5 1.7A5 5 0 0 1 17 18v4" />,
  ojo: (
    <>
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  camara: (
    <>
      <path d="M4 8h3l2-3h6l2 3h3v11H4Z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  carpeta: <path d="M3 6a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />,
  papelera: <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />,
  repetir: <path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" />,
  cronometro: (
    <>
      <circle cx="12" cy="14" r="8" />
      <path d="M10 2h4M12 14l3-3" />
    </>
  ),
  etiqueta: (
    <>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8Z" />
      <path d="M7 7h.01" />
    </>
  ),
  copo: <path d="M12 2v20M4.9 7l14.2 10M19.1 7 4.9 17M9 3.5l3 2.5 3-2.5M9 20.5l3-2.5 3 2.5" />,
  sobre: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  campana: <path d="M6 9a6 6 0 1 1 12 0c0 6 2 7.5 2 7.5H4S6 15 6 9ZM10 20a2 2 0 0 0 4 0" />,
  candado: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  documento: <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M8 13h8M8 17h6" />,
  altavoz: <path d="M11 5 6 9H3v6h3l5 4ZM15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />,
  altavozOff: <path d="M11 5 6 9H3v6h3l5 4ZM22 9l-6 6M16 9l6 6" />,
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
    </>
  ),
  luna: <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />,
  globo: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" />
    </>
  ),
  paleta: <path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-1 1.5-2-.6-1.2.3-2.5 1.7-2.5H17a4 4 0 0 0 4-4C21 6.5 17 3 12 3ZM7.5 11h.01M10 7.5h.01M14.5 7.5h.01" />,
  calculadora: <path d="M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1ZM8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />,
  llama: <path d="M12 3s5 4.5 5 9a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3 0-5 1-8Z" />,
  maletin: <path d="M4 8h16v11H4ZM9 8V5h6v3M4 13h16" />,
  bandera: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  externo: <path d="M7 17 17 7M8 7h9v9" />,
  play: <path d="M7 4v16l13-8Z" />,
  ticket: <path d="M3 9a2 2 0 0 0 0 6v3h18v-3a2 2 0 0 1 0-6V6H3ZM13 6v12" />,
  portatil: <path d="M4 5h16v11H4ZM2 19h20" />,
  paquete: <path d="M21 8 12 3 3 8v8l9 5 9-5ZM3 8l9 5 9-5M12 13v8" />,
  subir: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  editar: <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />,
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
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ verticalAlign: "-0.2em", flex: "none" }}
    >
      {DIBUJOS[nombre]}
    </svg>
  );
}

// Para los sitios donde el icono llega como texto (por ejemplo, desde una lista): si es el nombre de un icono, lo dibuja; si no, escribe el texto tal cual.
export function IconoDe({ nombre, tamano = 22 }: { nombre: string; tamano?: number }) {
  return nombre in DIBUJOS ? <Icono nombre={nombre as NombreIcono} tamano={tamano} /> : <>{nombre}</>;
}

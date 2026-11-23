// El iconito que va al lado del título de cada columna (como en Notion): dice de un vistazo qué tipo de dato es.
export type ClaveColumna = "nombre" | "etiquetas" | "telefono" | "destino" | "estado" | "tipo" | "fecha";

const TRAZOS: Record<ClaveColumna, React.ReactNode> = {
  // persona
  nombre: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" />
    </>
  ),
  // etiqueta
  etiquetas: (
    <>
      <path d="M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7a1 1 0 0 1 .7.3l7.3 7.3a1 1 0 0 1 0 1.4l-7.7 7.7a1 1 0 0 1-1.4 0l-7.3-7.3a1 1 0 0 1-.3-.7Z" />
      <circle cx="8.2" cy="8.2" r="1.2" />
    </>
  ),
  // teléfono
  telefono: <path d="M5 4h4l1.6 4.2-2.3 1.4a11 11 0 0 0 5.1 5.1l1.4-2.3L20 14v4a2 2 0 0 1-2 2A14 14 0 0 1 3 6a2 2 0 0 1 2-2Z" />,
  // origen: una bandera
  destino: <path d="M6 21V4m0 0h11l-2.2 4L17 12H6" />,
  // estado: círculo con una flechita
  estado: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m9 11 3 3 3-3" />
    </>
  ),
  // tipo: lista
  tipo: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  // fecha: calendario
  fecha: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
};

export default function IconoColumna({ id, tamano = 15 }: { id: ClaveColumna; tamano?: number }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {TRAZOS[id]}
    </svg>
  );
}

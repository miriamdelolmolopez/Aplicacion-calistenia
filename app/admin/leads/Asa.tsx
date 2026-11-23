// El «asa» para arrastrar una fila: seis puntitos. Se le pasan los eventos de useArrastre.
export default function Asa({ className, ...resto }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={className} aria-label="Arrastrar para ordenar (o enfócalo y usa las flechas arriba y abajo)" title="Arrastra para ordenar" {...resto}>
      <svg width="14" height="18" viewBox="0 0 14 18" fill="currentColor" aria-hidden="true">
        <circle cx="4" cy="4" r="1.4" />
        <circle cx="10" cy="4" r="1.4" />
        <circle cx="4" cy="9" r="1.4" />
        <circle cx="10" cy="9" r="1.4" />
        <circle cx="4" cy="14" r="1.4" />
        <circle cx="10" cy="14" r="1.4" />
      </svg>
    </button>
  );
}

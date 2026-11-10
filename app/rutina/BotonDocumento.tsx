// Icono de documento: descarga la rutina como documento de Word (también se abre en Google Docs).
export default function BotonDocumento({ id, texto = "Descargar documento", className }: { id: string; texto?: string; className?: string }) {
  return (
    <a
      href={`/api/rutina/${id}/documento`}
      download
      aria-label={texto}
      title={texto}
      onClick={(e) => e.stopPropagation()}
      className={className}
      style={className ? undefined : { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 40, height: 40, borderRadius: "50%", color: "inherit", opacity: 0.75, flex: "none" }}
    >
      <svg viewBox="0 0 24 24" width={className ? 18 : 22} height={className ? 18 : 22} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6M9 17h6" />
      </svg>
    </a>
  );
}

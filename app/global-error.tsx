"use client";

// Último recurso: si falla incluso el diseño general de la app, se muestra esto (sin depender de nada más).
export default function ErrorGlobal({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f3f4f5", color: "#17181a" }}>
        <main style={{ maxWidth: 420, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: 26 }}>Algo no ha ido bien</h1>
          <p style={{ color: "#6b6e75" }}>No te preocupes, tus datos están a salvo. Prueba otra vez; si sigue pasando, escríbenos.</p>
          <button
            type="button"
            onClick={reset}
            style={{ marginTop: 16, padding: "14px 24px", font: "inherit", fontWeight: 700, color: "#fff", background: "#0aa8c0", border: 0, borderRadius: 9999, cursor: "pointer" }}
          >
            Intentarlo de nuevo
          </button>
        </main>
      </body>
    </html>
  );
}

import estilos from "./historial.module.css";

export type Intento = { id: string; aciertos: number; total: number; creado_en: string };

export type TextosHistorial = {
  intentos: string;
  mejor: string;
  media: string;
  evolucion: string;
  sinIntentos: string;
};

const pct = (i: Intento) => Math.round((i.aciertos / i.total) * 100);

function fecha(iso: string, idioma: "es" | "en"): string {
  return new Intl.DateTimeFormat(idioma === "en" ? "en-GB" : "es-ES", {
    timeZone: "Europe/Madrid",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

// Resumen, gráfica y lista de los exámenes terminados (los más recientes primero).
export default function HistorialExamen({ intentos, t, idioma }: { intentos: Intento[]; t: TextosHistorial; idioma: "es" | "en" }) {
  if (intentos.length === 0) return <p className={estilos.vacio}>{t.sinIntentos}</p>;

  const porcentajes = intentos.map(pct);
  const mejor = Math.max(...porcentajes);
  const media = Math.round(porcentajes.reduce((a, b) => a + b, 0) / porcentajes.length);
  const ultimos = intentos.slice(0, 10).reverse();

  return (
    <div>
      <div className={estilos.resumen}>
        <div>
          <strong>{intentos.length}</strong>
          <span>{t.intentos}</span>
        </div>
        <div>
          <strong>{mejor}%</strong>
          <span>{t.mejor}</span>
        </div>
        <div>
          <strong>{media}%</strong>
          <span>{t.media}</span>
        </div>
      </div>

      <p className={estilos.titulo}>{t.evolucion}</p>
      <div className={estilos.grafica} role="img" aria-label={t.evolucion}>
        {ultimos.map((i) => (
          <div key={i.id} className={estilos.columna} title={`${fecha(i.creado_en, idioma)}: ${i.aciertos}/${i.total}`}>
            <span className={estilos.barra} style={{ height: `${Math.max(pct(i), 4)}%` }} />
            <small>{pct(i)}</small>
          </div>
        ))}
      </div>

      <ul className={estilos.lista}>
        {intentos.slice(0, 15).map((i) => (
          <li key={i.id}>
            <span>{fecha(i.creado_en, idioma)}</span>
            <strong>
              {i.aciertos}/{i.total} · {pct(i)}%
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

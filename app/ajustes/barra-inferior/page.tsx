"use client";

import BarraSuperior from "../../BarraSuperior";
import Cargando from "../../Cargando";
import styles from "../../formularios.module.css";
import estilos from "../../perfil/perfil.module.css";
import { MAX_BARRA, useMenuAdmin } from "../../useMenuAdmin";
import { useMiPerfil } from "../../useMiPerfil";

export default function BarraInferior() {
  const menu = useMenuAdmin();
  const perfil = useMiPerfil();
  const esAdmin = typeof perfil === "object" && perfil !== null && perfil.rolReal === "admin";

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/ajustes", texto: "volver" }} />
      <h1 style={{ margin: "12px 0 8px", fontSize: "2rem" }}>Barra de abajo</h1>
      {!esAdmin ? (
        <Cargando />
      ) : (
          <section className={`${styles.tarjeta} ${estilos.seccion}`}>
            <h2>Barra de abajo</h2>
            <p className={styles.ayuda}>
              Elige hasta {MAX_BARRA} opciones y su orden. Inicio va siempre la primera y «Más» al final.
            </p>
            {menu.barra.map((o, i) => (
              <div key={o.href} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <strong style={{ flex: 1 }}>{o.texto}</strong>
                <button type="button" className={styles.botonSecundario} aria-label={`Subir ${o.texto} en la barra`} disabled={i === 0} onClick={() => menu.moverEnBarra(o.href, -1)}>
                  ↑
                </button>
                <button type="button" className={styles.botonSecundario} aria-label={`Bajar ${o.texto} en la barra`} disabled={i === menu.barra.length - 1} onClick={() => menu.moverEnBarra(o.href, 1)}>
                  ↓
                </button>
                <button type="button" className={styles.botonSecundario} aria-label={`Quitar ${o.texto} de la barra`} onClick={() => menu.quitarDeBarra(o.href)}>
                  Quitar
                </button>
              </div>
            ))}
            {menu.barra.length < MAX_BARRA && (
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span className={styles.ayuda}>Añadir:</span>
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) menu.ponerEnBarra(e.target.value);
                  }}
                >
                  <option value="">Elige una opción…</option>
                  {menu.disponiblesBarra.map((o) => (
                    <option key={o.href} value={o.href}>
                      {o.texto}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </section>
      )}
    </main>
  );
}

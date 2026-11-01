"use client";

import BarraSuperior from "../../BarraSuperior";
import Cargando from "../../Cargando";
import styles from "../../formularios.module.css";
import estilos from "../../perfil/perfil.module.css";
import { useMenuAdmin } from "../../useMenuAdmin";
import { useMiPerfil } from "../../useMiPerfil";

export default function BarraLateral() {
  const menu = useMenuAdmin();
  const perfil = useMiPerfil();
  const esAdmin = typeof perfil === "object" && perfil !== null && perfil.rolReal === "admin";

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/ajustes", texto: "volver" }} />
      <h1 style={{ margin: "12px 0 8px", fontSize: "2rem" }}>Barra lateral</h1>
      {!esAdmin ? (
        <Cargando />
      ) : (
          <section className={`${styles.tarjeta} ${estilos.seccion}`}>
            <h2>Barra lateral</h2>
            <p className={styles.ayuda}>
              Marca lo que quieres ver y cámbialo de orden con las flechas. Se guarda en este dispositivo: si usas otro, hay que elegirlo ahí también.
            </p>
            {menu.ordenadas.map((o, i) => (
              <div key={o.href} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <label className={estilos.interruptor} style={{ flex: 1 }}>
                  <input type="checkbox" checked={menu.estaVisible(o)} disabled={o.fijo} onChange={(e) => menu.poner(o.href, e.target.checked)} />
                  <span>
                    {o.texto}
                    {o.fijo && " (siempre visible)"}
                  </span>
                </label>
                <button type="button" className={styles.botonSecundario} aria-label={`Subir ${o.texto}`} disabled={i === 0} onClick={() => menu.mover(o.href, -1)}>
                  ↑
                </button>
                <button type="button" className={styles.botonSecundario} aria-label={`Bajar ${o.texto}`} disabled={i === menu.ordenadas.length - 1} onClick={() => menu.mover(o.href, 1)}>
                  ↓
                </button>
              </div>
            ))}
          </section>
      )}
    </main>
  );
}

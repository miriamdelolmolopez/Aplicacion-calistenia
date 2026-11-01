"use client";

import BarraSuperior from "../../BarraSuperior";
import Cargando from "../../Cargando";
import styles from "../../formularios.module.css";
import estilos from "../../perfil/perfil.module.css";
import { useMenuAdmin } from "../../useMenuAdmin";
import ListaArrastrable from "../ListaArrastrable";
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
              Marca lo que quieres ver y cambia el orden arrastrando ⠿. Se guarda en este dispositivo: si usas otro, hay que elegirlo ahí también.
            </p>
            <ListaArrastrable
              alOrdenar={menu.ordenar}
              elementos={menu.ordenadas.map((o) => ({
                id: o.href,
                contenido: (
                  <label className={estilos.interruptor}>
                    <input type="checkbox" checked={menu.estaVisible(o)} disabled={o.fijo} onChange={(e) => menu.poner(o.href, e.target.checked)} />
                    <span>
                      {o.texto}
                      {o.fijo && " (siempre visible)"}
                    </span>
                  </label>
                ),
              }))}
            />
          </section>
      )}
    </main>
  );
}

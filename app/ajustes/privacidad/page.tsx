"use client";

import BarraSuperior from "../../BarraSuperior";
import Cargando from "../../Cargando";
import styles from "../../formularios.module.css";
import estilos from "../../perfil/perfil.module.css";
import { textos } from "../../textos";
import { useIdioma } from "../../useIdioma";
import { usePreferencias } from "../usePreferencias";

export default function Privacidad() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const { pref, cambiar, cambiarImagen } = usePreferencias();

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/ajustes", texto: "volver" }} />
      <h1 style={{ margin: "12px 0 8px", fontSize: "2rem" }}>{t.privacidadTitulo}</h1>
      {!pref ? (
        <Cargando />
      ) : (
        <section className={`${styles.tarjeta} ${estilos.seccion}`}>
          <label className={estilos.interruptor}>
            <input type="checkbox" checked={pref.mostrar_foto} onChange={(e) => cambiar("mostrar_foto", e.target.checked)} />
            <span>{t.mostrarFoto}</span>
          </label>
          <label className={estilos.interruptor}>
            <input type="checkbox" checked={pref.mostrar_apellido} onChange={(e) => cambiar("mostrar_apellido", e.target.checked)} />
            <span>{t.mostrarApellido}</span>
          </label>
          <label className={estilos.interruptor}>
            <input type="checkbox" checked={pref.avisar_cumple} onChange={(e) => cambiar("avisar_cumple", e.target.checked)} />
            <span>{t.avisarCumple}</span>
          </label>
          <label className={estilos.interruptor}>
            <input type="checkbox" checked={pref.imagen} onChange={(e) => cambiarImagen(e.target.checked)} />
            <span>
              {idioma === "en"
                ? "I authorise the use of photos and videos in which I appear on social media and professional channels"
                : "Autorizo el uso de fotos y vídeos en los que aparezca en redes sociales y canales profesionales"}
            </span>
          </label>
          <p className={styles.ayuda}>{t.privacidadNota}</p>
        </section>
      )}
    </main>
  );
}

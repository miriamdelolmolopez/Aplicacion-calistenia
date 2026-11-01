import Cargando from "../../../Cargando";
import styles from "../../admin.module.css";

// Mientras se abre la ficha de una persona (tarda un poco) se ve esto, para que se note que ha pulsado.
export default function Cargandoficha() {
  return (
    <main className={styles.pagina}>
      <Cargando />
    </main>
  );
}

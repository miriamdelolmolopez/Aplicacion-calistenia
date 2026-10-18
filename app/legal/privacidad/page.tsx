import styles from "../../formularios.module.css";

export const metadata = { title: "Política de privacidad · Privacy policy" };

export default function Privacidad() {
  return (
    <main className={styles.pagina}>
      <div className={styles.cabecera}>
        <h1>Política de privacidad</h1>
        <p>Privacy policy</p>
      </div>
      <div className={styles.tarjeta}>
        <p>
          Texto pendiente. Miriam aportará el texto legal definitivo antes de
          abrir la app a alumnos.
        </p>
        <p>
          Text pending. Miriam will provide the final legal text before the app
          is opened to students.
        </p>
      </div>
    </main>
  );
}

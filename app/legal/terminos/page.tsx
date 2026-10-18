import styles from "../../formularios.module.css";

export const metadata = { title: "Términos y condiciones · Terms and conditions" };

export default function Terminos() {
  return (
    <main className={styles.pagina}>
      <div className={styles.cabecera}>
        <h1>Términos y condiciones</h1>
        <p>Terms and conditions</p>
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

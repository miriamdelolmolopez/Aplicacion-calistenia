import { notFound } from "next/navigation";
import Icono from "../Icono";
import etq from "../etiquetas.module.css";
import formularios from "../formularios.module.css";
import nav from "../navegacion.module.css";
import inicio from "../inicio/inicio.module.css";
import Seccion, { Accesos, Fila } from "../ui/Seccion";

// Galería interna de muestra para revisar el diseño con datos inventados. Solo existe en desarrollo (en producción da «no encontrada»).
export default function Galeria() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className={formularios.pagina} style={{ gap: 16 }}>
      <header className={inicio.banda}>
        <div className={inicio.bandaArriba}>
          <span className={inicio.bandaAvatar} style={{ width: 32, height: 32, background: "#fff" }} />
          <span className={inicio.bandaMarca}>CalisCoach</span>
          <span className={inicio.cristal}>
            <Icono nombre="campana" tamano={20} />
          </span>
        </div>
        <p className={inicio.bandaFecha}>sábado, 21 de noviembre</p>
        <h1 className={inicio.bandaSaludo}>Hola Marta</h1>
      </header>

      <Seccion icono="inicio" titulo="Hoy" derecha="1/2">
        <Fila icono="reservas" titulo="Pino principiantes" sub="lun, 23 nov, 18:35" estado="flecha" href="#" />
        <Fila icono="rutina" titulo="Tu entreno" sub="Rutina de noviembre" estado="pendiente" href="#" />
        <Fila icono="progreso" titulo="Entreno de ayer" sub="Completado" estado="hecho" href="#" />
      </Seccion>

      <Seccion icono="biblioteca" titulo="Recursos">
        <Accesos
          items={[
            { href: "#", icono: "aprende", texto: "Aprende" },
            { href: "#", icono: "academia", texto: "Cursos" },
            { href: "#", icono: "tablon", texto: "Tablón" },
            { href: "#", icono: "pagos", texto: "Mis pagos" },
            { href: "#", icono: "ayuda", texto: "Ayuda" },
            { href: "#", icono: "ajustes", texto: "Ajustes" },
          ]}
        />
      </Seccion>

      <section className={formularios.tarjeta}>
        <h2 style={{ margin: 0, fontSize: "1.1rem" }}>Componentes</h2>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <span className={`${etq.etq} ${etq.verde}`}>Alumno/a</span>
          <span className={`${etq.etq} ${etq.ambar}`}>Pago pendiente</span>
          <span className={`${etq.etq} ${etq.rojo}`}>Caduca hoy</span>
          <span className={`${etq.etq} ${etq.azul}`}>Online</span>
          <span className={`${etq.etq} ${etq.lila}`}>Invitado/a</span>
          <span className={`${etq.etq} ${etq.gris}`}>Congelado/a</span>
        </div>
        <div className={formularios.campo}>
          <label htmlFor="g-nombre">Nombre</label>
          <input id="g-nombre" defaultValue="Marta" />
        </div>
        <button type="button" className={formularios.boton}>
          Guardar cambios
        </button>
        <button type="button" className={`${formularios.boton} ${formularios.botonSecundario}`}>
          Cancelar
        </button>
      </section>

      <nav className={nav.barra} style={{ "--columnas": 5 } as React.CSSProperties} aria-label="Muestra de la barra de abajo">
        {(["inicio", "reservar", "rutina", "progreso", "perfil"] as const).map((n, i) => (
          <a key={n} href="#" className={`${nav.pestana} ${i === 0 ? nav.activa : ""}`}>
            <span className={nav.icono}>
              <Icono nombre={n} tamano={22} />
            </span>
            <span className={nav.texto}>{n}</span>
          </a>
        ))}
      </nav>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import estilos from "./inicio.module.css";
import { obtenerResumenAdmin, type PersonaResumen, type ResumenAdmin } from "./accionesAdmin";

type Clave = "ingresos" | "activos" | "nuevos" | "caducan" | "renovar" | "pendientes" | "perdidos";

function euros(centimos: number): string {
  return (centimos / 100).toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + " €";
}

function Lista({ personas, vacio }: { personas: PersonaResumen[]; vacio: string }) {
  if (personas.length === 0) return <p className={estilos.resumenVacio}>{vacio}</p>;
  return (
    <ul className={estilos.resumenLista}>
      {personas.map((p, i) => (
        <li key={`${p.id}-${i}`}>
          {p.id ? <Link href={`/admin/usuarios/${p.id}`}>{p.nombre}</Link> : <span>{p.nombre}</span>}
          {p.detalle && <small>{p.detalle}</small>}
        </li>
      ))}
    </ul>
  );
}

// Comparación pequeña con el mes anterior: flecha verde si sube, roja si baja (al revés cuando subir es malo).
function Comparacion({ actual, anterior, texto, subirEsBueno = true }: { actual: number; anterior: number; texto: string; subirEsBueno?: boolean }) {
  const sube = actual > anterior;
  const baja = actual < anterior;
  const bueno = sube ? subirEsBueno : !subirEsBueno;
  return (
    <span className={estilos.comparacion}>
      Mes anterior: {texto}
      {(sube || baja) && (
        <b className={bueno ? estilos.sube : estilos.baja} aria-label={sube ? "más que el mes anterior" : "menos que el mes anterior"}>
          {sube ? "▲" : "▼"}
        </b>
      )}
    </span>
  );
}

// Cuadros de resumen del Inicio de la administradora. Cada uno se pulsa para ver el detalle.
export default function ResumenAdminTarjetas() {
  const [datos, setDatos] = useState<ResumenAdmin | null>(null);
  const [error, setError] = useState(false);
  const [abierta, setAbierta] = useState<Clave | null>(null);

  useEffect(() => {
    obtenerResumenAdmin()
      .then(setDatos)
      .catch(() => setError(true));
  }, []);

  if (error) return <p className={estilos.resumenVacio}>No se ha podido cargar el resumen.</p>;
  if (!datos) return <p className={estilos.resumenVacio}>Cargando resumen…</p>;

  type Tarjeta = { clave: Clave; titulo: string; valor: string; pie: React.ReactNode; tono?: "mal" };
  const principales: Tarjeta[] = [
    {
      clave: "ingresos",
      titulo: "Ingresos del mes",
      valor: euros(datos.ingresosMes),
      pie: <Comparacion actual={datos.ingresosMes} anterior={datos.ingresosMesAnterior} texto={euros(datos.ingresosMesAnterior)} />,
    },
    {
      clave: "activos",
      titulo: "Alumnos activos",
      valor: String(datos.activos.total),
      pie: <Comparacion actual={datos.activos.total} anterior={datos.activosMesAnterior} texto={String(datos.activosMesAnterior)} />,
    },
    {
      clave: "nuevos",
      titulo: "Nuevos del mes",
      valor: String(datos.nuevos.length),
      pie: <Comparacion actual={datos.nuevos.length} anterior={datos.nuevosMesAnterior.length} texto={String(datos.nuevosMesAnterior.length)} />,
    },
  ];
  const alertas: Tarjeta[] = [
    { clave: "caducan", titulo: "Caducan pronto", valor: String(datos.caducanPronto.length), pie: "En los próximos 7 días" },
    { clave: "renovar", titulo: "Bonos por renovar", valor: String(datos.porRenovar.length), pie: "Bono agotado, sin otro activo" },
    {
      clave: "pendientes",
      titulo: "Pagos pendientes",
      valor: euros(datos.pendientes.total),
      pie: `${datos.pendientes.personas.length} ${datos.pendientes.personas.length === 1 ? "persona debe" : "personas deben"} pagar`,
      tono: datos.pendientes.total > 0 ? "mal" : undefined,
    },
    {
      clave: "perdidos",
      titulo: "Alumnos perdidos este mes",
      valor: String(datos.perdidos.length),
      pie: <Comparacion actual={datos.perdidos.length} anterior={datos.perdidosMesAnterior.length} texto={String(datos.perdidosMesAnterior.length)} subirEsBueno={false} />,
      tono: datos.perdidos.length > 0 ? "mal" : undefined,
    },
  ];

  const pinta = (t: Tarjeta) => (
    <button
      key={t.clave}
      type="button"
      className={`${estilos.resumenTarjeta} ${abierta === t.clave ? estilos.resumenActiva : ""}`}
      aria-expanded={abierta === t.clave}
      onClick={() => setAbierta(abierta === t.clave ? null : t.clave)}
    >
      <span className={estilos.resumenTitulo}>{t.titulo}</span>
      <strong className={`${estilos.resumenValor} ${t.tono === "mal" ? estilos.mal : ""}`}>{t.valor}</strong>
      <span className={estilos.resumenPie}>{t.pie}</span>
    </button>
  );

  const dif = datos.diferenciaPct;
  const difNuevos = datos.diferenciaNuevosPct;

  return (
    <section className={estilos.resumen} aria-label="Resumen del negocio">
      <div className={estilos.resumenCuadricula}>{principales.map(pinta)}</div>

      <h2 className={estilos.resumenSeccion}>Alertas</h2>
      <div className={estilos.resumenCuadricula}>{alertas.map(pinta)}</div>

      {abierta && (
        <div className={estilos.resumenDetalle}>
          {abierta === "ingresos" && (
            <>
              <h3>Ingresos del mes</h3>
              <p>
                {euros(datos.ingresosMes)} cobrados este mes. Mes anterior: {euros(datos.ingresosMesAnterior)}
                {dif === null ? "." : ` (${dif >= 0 ? "+" : ""}${dif}%).`}
              </p>
              <Link href="/admin/informes?vista=pagos">Ver informe de ingresos →</Link>
            </>
          )}
          {abierta === "activos" && (
            <>
              <h3>Alumnos activos por tipo</h3>
              <p className={estilos.resumenVacio}>
                Al acabar el mes anterior había {datos.activosMesAnterior}. Una persona con varios servicios aparece en cada uno.
              </p>
              <h4>Grupales ({datos.activos.grupal})</h4>
              <Lista personas={datos.activosPorServicio.grupal} vacio="Nadie con bono grupal activo." />
              <h4>Individuales ({datos.activos.individual})</h4>
              <Lista personas={datos.activosPorServicio.individual} vacio="Nadie con bono individual activo." />
              <h4>Online ({datos.activos.online})</h4>
              <Lista personas={datos.activosPorServicio.online} vacio="Nadie con plan online activo." />
              <Link href="/admin/usuarios">Ver todos los usuarios →</Link>
            </>
          )}
          {abierta === "nuevos" && (
            <>
              <h3>Nuevos del mes</h3>
              <p>
                {difNuevos === null
                  ? `Mes anterior: ${datos.nuevosMesAnterior.length}.`
                  : `Este mes ${datos.nuevos.length} frente a ${datos.nuevosMesAnterior.length} el mes anterior (${difNuevos >= 0 ? "+" : ""}${difNuevos}%).`}
              </p>
              <Lista personas={datos.nuevos} vacio="Todavía nadie ha empezado este mes." />
            </>
          )}
          {abierta === "caducan" && (
            <>
              <h3>Caducan pronto</h3>
              <Lista personas={datos.caducanPronto} vacio="Ningún bono caduca en los próximos 7 días." />
            </>
          )}
          {abierta === "renovar" && (
            <>
              <h3>Bonos por renovar</h3>
              <Lista personas={datos.porRenovar} vacio="Nadie con el bono agotado." />
              <Link href="/admin/bonos">Ir a Bonos y pagos →</Link>
            </>
          )}
          {abierta === "pendientes" && (
            <>
              <h3>Pagos pendientes</h3>
              <Lista personas={datos.pendientes.personas} vacio="No hay pagos pendientes." />
              <Link href="/admin/bonos">Ir a Bonos y pagos →</Link>
            </>
          )}
          {abierta === "perdidos" && (
            <>
              <h3>Alumnos perdidos este mes</h3>
              <p className={estilos.resumenVacio}>
                Personas cuyo bono terminó este mes (se agotó o caducó) y no tienen otro activo ni en espera. El mes anterior fueron{" "}
                {datos.perdidosMesAnterior.length}. Es aproximado: se calcula con el historial de los bonos.
              </p>
              <Lista personas={datos.perdidos} vacio="Nadie ha dejado de venir este mes." />
              <h4>Mes anterior ({datos.perdidosMesAnterior.length})</h4>
              <Lista personas={datos.perdidosMesAnterior} vacio="Nadie el mes anterior." />
            </>
          )}
        </div>
      )}
    </section>
  );
}

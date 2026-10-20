"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import estilos from "./inicio.module.css";
import { obtenerResumenAdmin, type PersonaResumen, type ResumenAdmin } from "./accionesAdmin";

type Clave = "ingresos" | "diferencia" | "activos" | "caducan" | "nuevos" | "nuevosAnterior" | "renovar" | "pendientes";

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

  const dif = datos.diferenciaPct;
  const subida = dif !== null && dif >= 0;
  const difNuevos = datos.diferenciaNuevosPct;
  const subidaNuevos = difNuevos !== null && difNuevos >= 0;

  const tarjetas: { clave: Clave; titulo: string; valor: string; pie: string; tono?: "bien" | "mal" }[] = [
    { clave: "ingresos", titulo: "Ingresos del mes", valor: euros(datos.ingresosMes), pie: "Pagos cobrados este mes" },
    {
      clave: "diferencia",
      titulo: "Ingresos mes anterior",
      valor: euros(datos.ingresosMesAnterior),
      pie: dif === null ? "Sin comparación (el mes anterior no hubo)" : `Este mes: ${subida ? "▲ +" : "▼ "}${dif}% frente al anterior`,
      tono: dif === null ? undefined : subida ? "bien" : "mal",
    },
    { clave: "activos", titulo: "Alumnos activos", valor: String(datos.activos.total), pie: "Con un bono activo" },
    { clave: "caducan", titulo: "Caducan pronto", valor: String(datos.caducanPronto.length), pie: "En los próximos 7 días" },
    { clave: "nuevos", titulo: "Nuevos del mes", valor: String(datos.nuevos.length), pie: "Han empezado este mes" },
    {
      clave: "nuevosAnterior",
      titulo: "Nuevos: mes anterior",
      valor: String(datos.nuevosMesAnterior.length),
      pie:
        difNuevos === null
          ? "Sin comparación (el mes anterior no hubo)"
          : `Este mes: ${subidaNuevos ? "▲ +" : "▼ "}${difNuevos}% frente al anterior`,
      tono: difNuevos === null ? undefined : subidaNuevos ? "bien" : "mal",
    },
    { clave: "renovar", titulo: "Bonos por renovar", valor: String(datos.porRenovar.length), pie: "Bono agotado, sin otro activo" },
    {
      clave: "pendientes",
      titulo: "Pagos pendientes",
      valor: euros(datos.pendientes.total),
      pie: `${datos.pendientes.personas.length} ${datos.pendientes.personas.length === 1 ? "persona debe" : "personas deben"} pagar`,
      tono: datos.pendientes.total > 0 ? "mal" : undefined,
    },
  ];

  return (
    <section className={estilos.resumen} aria-label="Resumen del negocio">
      <div className={estilos.resumenCuadricula}>
        {tarjetas.map((t) => (
          <button
            key={t.clave}
            type="button"
            className={`${estilos.resumenTarjeta} ${abierta === t.clave ? estilos.resumenActiva : ""}`}
            aria-expanded={abierta === t.clave}
            onClick={() => setAbierta(abierta === t.clave ? null : t.clave)}
          >
            <span className={estilos.resumenTitulo}>{t.titulo}</span>
            <strong className={`${estilos.resumenValor} ${t.tono === "bien" ? estilos.bien : t.tono === "mal" ? estilos.mal : ""}`}>
              {t.valor}
            </strong>
            <span className={estilos.resumenPie}>{t.pie}</span>
          </button>
        ))}
      </div>

      {abierta && (
        <div className={estilos.resumenDetalle}>
          {abierta === "ingresos" && (
            <>
              <h3>Ingresos del mes</h3>
              <p>
                {euros(datos.ingresosMes)} cobrados este mes. Mes anterior: {euros(datos.ingresosMesAnterior)}.
              </p>
              <Link href="/admin/estadisticas">Ver informe de ingresos →</Link>
            </>
          )}
          {abierta === "diferencia" && (
            <>
              <h3>Ingresos del mes anterior</h3>
              <p>
                {dif === null
                  ? "El mes anterior no hubo ingresos, así que no hay porcentaje que comparar."
                  : subida
                    ? `Estás facturando un ${dif}% más que el mes pasado (${euros(datos.ingresosMes)} frente a ${euros(datos.ingresosMesAnterior)}).`
                    : `Estás facturando un ${Math.abs(dif)}% menos que el mes pasado (${euros(datos.ingresosMes)} frente a ${euros(datos.ingresosMesAnterior)}). El mes aún no ha terminado.`}
              </p>
              <Link href="/admin/estadisticas">Ver informe de ingresos →</Link>
            </>
          )}
          {abierta === "activos" && (
            <>
              <h3>Alumnos activos por tipo</h3>
              <p className={estilos.resumenVacio}>Una persona con varios servicios aparece en cada uno.</p>
              <h4>Grupales ({datos.activos.grupal})</h4>
              <Lista personas={datos.activosPorServicio.grupal} vacio="Nadie con bono grupal activo." />
              <h4>Individuales ({datos.activos.individual})</h4>
              <Lista personas={datos.activosPorServicio.individual} vacio="Nadie con bono individual activo." />
              <h4>Online ({datos.activos.online})</h4>
              <Lista personas={datos.activosPorServicio.online} vacio="Nadie con plan online activo." />
              <Link href="/admin/usuarios">Ver todos los usuarios →</Link>
            </>
          )}
          {abierta === "caducan" && (
            <>
              <h3>Caducan pronto</h3>
              <Lista personas={datos.caducanPronto} vacio="Ningún bono caduca en los próximos 7 días." />
            </>
          )}
          {abierta === "nuevos" && (
            <>
              <h3>Nuevos del mes</h3>
              <Lista personas={datos.nuevos} vacio="Todavía nadie ha empezado este mes." />
            </>
          )}
          {abierta === "nuevosAnterior" && (
            <>
              <h3>Nuevos del mes anterior</h3>
              <p>
                {difNuevos === null
                  ? "El mes anterior no empezó nadie, así que no hay porcentaje que comparar."
                  : `Este mes han empezado ${datos.nuevos.length} frente a ${datos.nuevosMesAnterior.length} el mes anterior (${subidaNuevos ? "+" : ""}${difNuevos}%).`}
              </p>
              <Lista personas={datos.nuevosMesAnterior} vacio="Nadie empezó el mes anterior." />
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
        </div>
      )}
    </section>
  );
}

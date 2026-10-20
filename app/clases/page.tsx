"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import Avatar from "../Avatar";
import BarraSuperior from "../BarraSuperior";
import { obtenerMisBonos } from "../cuenta/acciones";
import styles from "../formularios.module.css";
import { obtenerFotos, obtenerProfe } from "../perfil/acciones";
import { textos, type ClaveTexto } from "../textos";
import PanelFiltros from "../PanelFiltros";
import { useIdioma } from "../useIdioma";
import estilos from "./clases.module.css";
import { obtenerFotosApp } from "../fotos/acciones";
import ReservaConfirmada, { type ClaseConfirmada } from "./ReservaConfirmada";
import SaberMas from "./SaberMas";
import { descargarIcs } from "@/lib/calendario";
import { claveDia, textoDia, textoHora } from "@/lib/fechas";
import { fondoFoto, fotoDeClase } from "@/lib/fotos";
import { createClient } from "@/lib/supabase/client";
import {
  cancelarMiReserva,
  reservarClase,
  salirListaEspera,
  unirseListaEspera,
} from "./acciones";

type Clase = {
  id: string;
  tipo: string;
  empieza_en: string;
  plazas: number;
  estado: string;
  ocupadas: number;
  mi_reserva: string | null;
  apuntados: string[];
  apuntados_ids: string[];
  plazas_prueba: number;
  ocupadas_prueba: number;
  en_espera: boolean;
  posicion: number;
  hay_espera: number;
  prioridad: boolean;
  duracion_min: number;
  tarde: boolean; // quedan menos horas que el límite de cancelación
  horasCancelacion: number; // límite de cancelación de este tipo de clase
  creditos: number; // cuántas clases del bono gasta
  servicio: string;
  incluido: boolean; // puede reservarla según lo que tiene contratado
};

type Aviso = { tipo: "ok" | "error"; clave: ClaveTexto; clase?: Clase };

type Datos = {
  sinEspera: string[]; // tipos de clase sin lista de espera
  horas: number;
  horasIndividual: number;
  dias: number;
  hoy: string;
  rol: string;
  datosCompletos: boolean;
  pruebaGastada: boolean;
  restantes: number | null;
  lista: Clase[];
};

// Lee todo lo que necesita la pantalla (no cambia ningún estado).
async function obtenerDatos(): Promise<Datos> {
  const supabase = createClient();

  const { data: ajustes } = await supabase.from("ajustes").select("clave, valor");
  const valor = (clave: string, defecto: number) =>
    Number(ajustes?.find((a) => a.clave === clave)?.valor ?? defecto);
  const { data: tiposDatos } = await supabase.from("tipos_clase").select("nombre, lista_espera, cancelacion_horas, reserva_dias_max, creditos");
  const tiposReglas = new Map(
    ((tiposDatos ?? []) as { nombre: string; lista_espera: boolean; cancelacion_horas: number | null; reserva_dias_max: number | null; creditos: number }[]).map((t) => [t.nombre, t]),
  );
  const sinEspera = [...tiposReglas.values()].filter((t) => !t.lista_espera).map((t) => t.nombre);
  const horas = valor("cancelacion_horas", 2);
  const horasIndividual = valor("cancelacion_horas_individual", 12);
  const dias = valor("reserva_dias_max", 14);

  const { data: datosSesion } = await supabase.auth.getSession();
  const sesion = { user: datosSesion.session?.user ?? null };
  const { data: perfil } = sesion.user
    ? await supabase
        .from("profiles")
        .select("rol, datos_completos")
        .eq("id", sesion.user.id)
        .maybeSingle()
    : { data: null };

  // Si algún tipo de clase se puede reservar con más antelación que el ajuste general, se piden también esos días.
  const diasConsulta = Math.max(dias, ...[...tiposReglas.values()].map((t) => t.reserva_dias_max ?? 0));
  const { data } = await supabase.rpc("clases_proximas", { p_dias: diasConsulta });
  const ahora = Date.now();
  const lista = ((data ?? []) as Omit<Clase, "tarde" | "horasCancelacion" | "creditos">[])
    .filter((c) => new Date(c.empieza_en).getTime() - ahora <= (tiposReglas.get(c.tipo)?.reserva_dias_max ?? dias) * 86400000)
    .map((c) => {
      const horasC = tiposReglas.get(c.tipo)?.cancelacion_horas ?? (c.servicio === "individual" ? horasIndividual : horas);
      return {
        ...c,
        horasCancelacion: horasC,
        creditos: tiposReglas.get(c.tipo)?.creditos ?? 1,
        tarde: new Date(c.empieza_en).getTime() - horasC * 3600 * 1000 < ahora,
      };
    });

  const { data: gastada } = await supabase.rpc("mi_prueba_gastada");
  const bonos = await obtenerMisBonos();
  // Solo cuenta el bono de clases grupales (el plan online no tiene clases).
  const activos = bonos.filter((b) => b.estado === "activo" && b.servicio !== "online");

  return {
    sinEspera,
    horas,
    horasIndividual,
    dias,
    hoy: claveDia(new Date(ahora).toISOString()),
    rol: perfil?.rol ?? "",
    datosCompletos: !!perfil?.datos_completos,
    pruebaGastada: gastada === true,
    restantes: activos.length > 0 ? activos.reduce((suma, b) => suma + b.clasesRestantes, 0) : null,
    lista,
  };
}

// Enlaces temporales a las fotos de quienes están apuntados (solo las ven las alumnas).
async function fotosDe(d: Datos): Promise<Record<string, string>> {
  const ids = [...new Set(d.lista.flatMap((c) => c.apuntados_ids))];
  return ids.length ? obtenerFotos(ids) : {};
}

// Suma días a una fecha AAAA-MM-DD (sin zonas horarias de por medio).
function sumarDias(clave: string, dias: number): string {
  const d = new Date(`${clave}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

// 0 = lunes … 6 = domingo
const diaSemana = (clave: string) => (new Date(`${clave}T12:00:00Z`).getUTCDay() + 6) % 7;

const LETRAS = {
  es: ["L", "M", "X", "J", "V", "S", "D"],
  en: ["M", "T", "W", "T", "F", "S", "S"],
};

export default function Clases() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const router = useRouter();

  const [datos, setDatos] = useState<Datos | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState<string | null>(null);
  const [dia, setDia] = useState<string | null>(null);
  const [semana, setSemana] = useState<number | null>(null);
  const [fotos, setFotos] = useState<Record<string, string>>({});
  const [profe, setProfe] = useState<{ nombre: string; foto: string | null } | null>(null);
  const [fotosTipos, setFotosTipos] = useState<Record<string, string>>({});
  const [verNombres, setVerNombres] = useState<string | null>(null);
  const [descripciones, setDescripciones] = useState<Record<string, { es: string | null; en: string | null }>>({});
  const [saberMas, setSaberMas] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<"todo" | "grupal" | "individual">("todo");
  const [confirmada, setConfirmada] = useState<ClaseConfirmada | null>(null);
  const [menu, setMenu] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const d = await obtenerDatos();
    setDatos(d);
    setFotos(await fotosDe(d));
  }, []);

  useEffect(() => {
    obtenerDatos().then(async (d) => {
      setDatos(d);
      setFotos(await fotosDe(d));
    });
    obtenerProfe().then(setProfe);
    obtenerFotosApp().then((f) => setFotosTipos(f.tipos));
    createClient()
      .from("tipos_clase")
      .select("nombre, descripcion, descripcion_en")
      .then(({ data }) =>
        setDescripciones(
          Object.fromEntries(
            ((data ?? []) as { nombre: string; descripcion: string | null; descripcion_en: string | null }[]).map((d) => [
              d.nombre,
              { es: d.descripcion, en: d.descripcion_en },
            ]),
          ),
        ),
      );
  }, []);

  const esAlumno = datos?.rol === "alumno";
  const esInvitado = datos?.rol === "invitado";
  const veApuntados = datos?.rol === "alumno" || datos?.rol === "admin";

  async function ejecutar(
    c: Clase,
    accion: () => Promise<{ ok: boolean; codigo?: string; devuelta?: boolean }>,
    claveOk: (devuelta?: boolean) => ClaveTexto,
    conCalendario = false,
  ) {
    setAviso(null);
    setConfirmando(null);
    setTrabajando(c.id);
    const r = await accion();
    setTrabajando(null);
    if (r.ok && conCalendario) {
      setConfirmada({ id: c.id, tipo: c.tipo, empieza_en: c.empieza_en, duracion_min: c.duracion_min });
    } else {
      setAviso(
        r.ok
          ? { tipo: "ok", clave: claveOk(r.devuelta) }
          : { tipo: "error", clave: `err_${r.codigo}` as ClaveTexto },
      );
    }
    await cargar();
  }

  const reservar = (c: Clase) =>
    ejecutar(c, () => reservarClase(c.id), () => (esInvitado ? "okReservadaPrueba" : "okReservada"), true);

  const cancelar = (c: Clase) =>
    c.mi_reserva
      ? ejecutar(
          c,
          () => cancelarMiReserva(c.mi_reserva!),
          (devuelta) =>
            esInvitado
              ? devuelta
                ? "okPruebaConservada"
                : "okPruebaPerdida"
              : devuelta
                ? "okDevuelta"
                : "okPerdida",
        )
      : Promise.resolve();

  const unirse = (c: Clase) => ejecutar(c, () => unirseListaEspera(c.id), () => "okEsperaUnido");
  const salir = (c: Clase) => ejecutar(c, () => salirListaEspera(c.id), () => "okEsperaSalido");

  const alCalendario = (c: Clase) => {
    setMenu(null);
    descargarIcs({
      id: c.id,
      titulo: `${c.tipo} · Miriam del Olmo`,
      inicioIso: c.empieza_en,
      duracionMin: c.duracion_min || 60,
    });
  };

  // ---- Tira de días: semanas de lunes a domingo; solo se pueden elegir los días con plazo de reserva ----
  const hoy = datos?.hoy ?? "";
  const ultimo = datos ? sumarDias(datos.hoy, datos.dias) : "";
  const primerLunes = datos ? sumarDias(datos.hoy, -diaSemana(datos.hoy)) : "";
  const numSemanas = datos ? Math.floor((diaSemana(datos.hoy) + datos.dias) / 7) + 1 : 1;
  // Al entrar se enseña hoy; si hoy no hay clases, el primer día que sí tiene.
  const primerDiaConClases = datos && datos.lista.length > 0 ? claveDia(datos.lista[0].empieza_en) : hoy;
  const hayHoy = !!datos && datos.lista.some((c) => claveDia(c.empieza_en) === hoy);
  const diaElegido = dia ?? (hayHoy ? hoy : primerDiaConClases);
  const semanaActual =
    semana ?? (datos ? Math.floor((new Date(`${diaElegido}T12:00:00Z`).getTime() - new Date(`${primerLunes}T12:00:00Z`).getTime()) / (7 * 86400000)) : 0);
  const diasSemana = datos ? Array.from({ length: 7 }, (_, i) => sumarDias(primerLunes, semanaActual * 7 + i)) : [];

  const clasesDelDia = (datos?.lista ?? []).filter(
    (c) => claveDia(c.empieza_en) === diaElegido && (filtro === "todo" || c.servicio === filtro),
  );
  const etiquetaDia = (() => {
    if (!datos) return "";
    const texto = textoDia(`${diaElegido}T12:00:00Z`, idioma);
    if (diaElegido === hoy) return `${t.hoy} · ${texto}`;
    if (diaElegido === sumarDias(hoy, 1)) return `${t.manana} · ${texto}`;
    return texto;
  })();

  const boton = { minHeight: 44 } as const;

  return (
    <main className={styles.pagina}>
      <BarraSuperior izquierda={{ href: "/inicio", texto: "volver" }} />

      {datos && esAlumno && datos.restantes !== null && (
        <p className={styles.aviso}>
          {t.tienesClases}: <strong>{datos.restantes}</strong>
        </p>
      )}
      {datos && esAlumno && datos.restantes === null && <p className={styles.aviso}>{t.sinBono}</p>}
      {datos && esInvitado && (
        <p className={styles.aviso}>
          {datos.pruebaGastada ? (
            t.pruebaUsada
          ) : !datos.datosCompletos ? (
            <>
              {t.completaDatos}{" "}
              <Link href="/datos">
                <strong>{t.completarDatos}</strong>
              </Link>
            </>
          ) : (
            t.tienesPrueba
          )}
        </p>
      )}
      {datos && !esAlumno && !esInvitado && datos.rol !== "admin" && (
        <p className={styles.aviso}>{t.soloAlumnosInfo}</p>
      )}
      {aviso && (
        <div className={aviso.tipo === "error" ? styles.error : styles.aviso} role={aviso.tipo === "error" ? "alert" : "status"}>
          {t[aviso.clave]}
        </div>
      )}

      {datos === null && <p className={styles.aviso}>{t.cargando}</p>}

      {datos && (
        <>
          <Link href="/clases/mis-reservas" className={estilos.misReservas}>
            {t.verMisReservasBoton} →
          </Link>

          <PanelFiltros etiqueta={idioma === "en" ? "Filters" : "Filtros"} activos={filtro !== "todo" ? 1 : 0}>
          <div className={estilos.filtros} role="tablist" aria-label={t.filtroTodo}>
            {(
              [
                ["grupal", t.filtroGrupales],
                ["individual", t.filtroPersonal],
                ["todo", t.filtroTodo],
              ] as const
            ).map(([valor, texto]) => (
              <button
                key={valor}
                type="button"
                role="tab"
                aria-selected={filtro === valor}
                className={`${estilos.filtro} ${filtro === valor ? estilos.filtroActivo : ""}`}
                onClick={() => setFiltro(valor)}
              >
                {texto}
              </button>
            ))}
          </div>
          </PanelFiltros>

          <div className={estilos.cabeceraDia}>
            <span className={estilos.etiquetaDia}>{t.diaLabel}</span>
            <strong>{etiquetaDia}</strong>
          </div>

          <div className={estilos.tira}>
            <button
              type="button"
              className={estilos.flecha}
              aria-label={t.semanaAnterior}
              disabled={semanaActual <= 0}
              onClick={() => setSemana(semanaActual - 1)}
            >
              ‹
            </button>
            <div className={estilos.dias}>
              {diasSemana.map((d, i) => {
                const fuera = d < hoy || d > ultimo;
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={fuera}
                    className={`${estilos.dia} ${d === diaElegido ? estilos.diaElegido : ""}`}
                    onClick={() => {
                      setDia(d);
                      setConfirmando(null);
                      setVerNombres(null);
                    }}
                  >
                    <span>{LETRAS[idioma][i]}</span>
                    <strong>{Number(d.slice(8))}</strong>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              className={estilos.flecha}
              aria-label={t.semanaSiguiente}
              disabled={semanaActual >= numSemanas - 1}
              onClick={() => setSemana(semanaActual + 1)}
            >
              ›
            </button>
          </div>

          {clasesDelDia.length > 1 && (
            <div className={estilos.horas}>
              {clasesDelDia.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => document.getElementById(`clase-${c.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                  {textoHora(c.empieza_en)}
                </button>
              ))}
            </div>
          )}

          {clasesDelDia.length === 0 && <p className={styles.aviso}>{filtro === "todo" ? t.sinClasesDia : t.sinClasesFiltro}</p>}

          {clasesDelDia.map((c) => {
            const cancelada = c.estado === "cancelada";
            const completa = c.ocupadas >= c.plazas;
            const libres = Math.max(c.plazas - c.ocupadas, 0);
            const pruebaLibres = Math.max(Math.min(c.plazas_prueba, c.plazas) - c.ocupadas_prueba, 0);
            const puedeProbar = !!datos && esInvitado && datos.datosCompletos && !datos.pruebaGastada;
            const cuadrados = Array.from({ length: c.plazas }, (_, i) => i);
            const personal = c.servicio === "individual";
            // Se ve, pero solo se reserva lo contratado (la administradora no reserva).
            const noIncluida = !c.incluido && datos.rol !== "admin";

            return (
              <section
                key={c.id}
                id={`clase-${c.id}`}
                className={`${estilos.tarjeta} ${cancelada ? estilos.cancelada : ""} ${noIncluida && !c.mi_reserva ? estilos.noIncluida : ""}`}
              >
                <div className={estilos.titulo} style={{ backgroundImage: fondoFoto(fotoDeClase(c.tipo), fotosTipos[c.tipo]) }}>
                  <h2>{c.tipo}</h2>
                  <span className={estilos.hora}>{textoHora(c.empieza_en)}</span>
                </div>
                <div className={estilos.profe}>
                  <Avatar nombre={profe?.nombre ?? "Miriam"} url={profe?.foto} tamano={28} />
                  <span>{profe?.nombre ?? "Miriam"}</span>
                  {cancelada && <strong className={estilos.etiquetaCancelada}>{t.cancelada}</strong>}
                  <button type="button" className={estilos.saberMas} onClick={() => setSaberMas(c.tipo)}>
                    {t.saberMasLink}
                  </button>
                </div>

                {!cancelada && personal && (
                  <p className={estilos.plazas}>{completa ? t.huecoOcupado : t.huecoLibre}</p>
                )}

                {/* Quien está de prueba solo ve cuántas plazas de prueba quedan, no las plazas de la clase. */}
                {!cancelada && !personal && esInvitado && (
                  <>
                    <div className={estilos.cuadrados} aria-hidden="true">
                      {Array.from({ length: completa ? 0 : pruebaLibres }, (_, i) => (
                        <span key={i} className={`${estilos.cuadrado} ${estilos.libre}`} />
                      ))}
                    </div>
                    <p className={estilos.plazas}>
                      {completa || pruebaLibres === 0
                        ? t.sinPlazasPrueba
                        : `${pruebaLibres} ${pruebaLibres === 1 ? t.pruebaLibre : t.pruebaLibres}`}
                    </p>
                  </>
                )}

                {!cancelada && !personal && !esInvitado && (
                  <>
                    <button
                      type="button"
                      className={estilos.cuadrados}
                      onClick={() => veApuntados && c.apuntados.length > 0 && setVerNombres(verNombres === c.id ? null : c.id)}
                      aria-label={t.apuntadosLabel}
                    >
                      {cuadrados.map((i) => {
                        if (veApuntados && c.apuntados_ids[i]) {
                          const id = c.apuntados_ids[i];
                          return (
                            <span key={i} className={estilos.cuadrado} title={c.apuntados[i]}>
                              {fotos[id] ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={fotos[id]} alt={c.apuntados[i]} />
                              ) : (
                                <span className={estilos.iniciales}>{(c.apuntados[i] ?? "?").slice(0, 1)}</span>
                              )}
                            </span>
                          );
                        }
                        return (
                          <span
                            key={i}
                            className={`${estilos.cuadrado} ${i < c.ocupadas ? estilos.ocupado : estilos.libre}`}
                          />
                        );
                      })}
                    </button>

                    {verNombres === c.id && veApuntados && (
                      <p className={estilos.nombres}>
                        {t.apuntadosLabel}: {c.apuntados.join(", ")}
                      </p>
                    )}

                    <p className={estilos.plazas}>
                      {libres} {libres === 1 ? t.libre : t.libres} · {c.ocupadas}/{c.plazas} {t.plazasTotales}
                      {c.hay_espera > 0 && ` · ${t.listaEspera}: ${c.hay_espera}`}
                      {c.creditos > 1 && ` · ${idioma === "en" ? "uses" : "gasta"} ${c.creditos} ${idioma === "en" ? "credits" : "clases"}`}
                    </p>
                  </>
                )}

                {!cancelada && (
                  <div className={estilos.pie}>
                    <div className={estilos.menuCaja}>
                      <button
                        type="button"
                        className={estilos.puntos}
                        aria-label={t.masOpciones}
                        onClick={() => setMenu(menu === c.id ? null : c.id)}
                      >
                        ⋮
                      </button>
                      {menu === c.id && (
                        <div className={estilos.menu}>
                          <button type="button" onClick={() => alCalendario(c)}>
                            {t.alCalendario}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className={estilos.acciones}>
                      {/* Ya tiene reserva */}
                      {c.mi_reserva && confirmando !== c.id && (
                        <>
                          <span className={styles.ayuda}>✓ {t.reservada}</span>
                          <button
                            className={`${styles.boton} ${styles.botonSecundario}`}
                            style={boton}
                            disabled={trabajando === c.id}
                            onClick={() => setConfirmando(c.id)}
                          >
                            {t.cancelarReserva}
                          </button>
                        </>
                      )}

                      {/* Lo que no tiene contratado se ve, pero no se puede reservar */}
                      {!c.mi_reserva && noIncluida && <span className={styles.ayuda}>{t.noIncluido}</span>}

                      {/* Alumno sin reserva */}
                      {!c.mi_reserva && esAlumno && c.incluido && (
                        <>
                          {completa && !c.en_espera && !datos.sinEspera.includes(c.tipo) && (
                            <button className={styles.boton} style={boton} disabled={trabajando === c.id} onClick={() => unirse(c)}>
                              {trabajando === c.id ? t.cargando : t.unirseEspera}
                            </button>
                          )}
                          {completa && c.en_espera && (
                            <>
                              <span className={styles.ayuda}>
                                {t.enListaEspera} · {t.posicion} {c.posicion}
                              </span>
                              <button
                                className={`${styles.boton} ${styles.botonSecundario}`}
                                style={boton}
                                disabled={trabajando === c.id}
                                onClick={() => salir(c)}
                              >
                                {t.salirEspera}
                              </button>
                            </>
                          )}
                          {!completa && c.prioridad && !c.en_espera && <span className={styles.ayuda}>{t.plazaParaEspera}</span>}
                          {!completa && (!c.prioridad || c.en_espera) && (
                            <>
                              {c.prioridad && c.en_espera && (
                                <span className={styles.ayuda}>
                                  <strong>{t.hayPlaza}</strong>
                                </span>
                              )}
                              <button className={styles.boton} style={boton} disabled={trabajando === c.id} onClick={() => reservar(c)}>
                                {trabajando === c.id ? t.cargando : c.prioridad && c.en_espera ? t.confirmarPlaza : t.reservar}
                              </button>
                            </>
                          )}
                        </>
                      )}

                      {/* Invitado sin reserva */}
                      {!c.mi_reserva && puedeProbar && c.incluido && (
                        <>
                          {completa ? (
                            <span className={styles.ayuda}>{t.completa}</span>
                          ) : pruebaLibres === 0 ? (
                            <span className={styles.ayuda}>{t.sinPlazasPrueba}</span>
                          ) : c.prioridad ? (
                            <span className={styles.ayuda}>{t.plazaParaEspera}</span>
                          ) : (
                            <button className={styles.boton} style={boton} disabled={trabajando === c.id} onClick={() => reservar(c)}>
                              {trabajando === c.id ? t.cargando : t.reservarPrueba}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {confirmando === c.id && (
                  <div className={styles.aviso} role="alert">
                    <p style={{ margin: "0 0 10px" }}>
                      {esInvitado
                        ? c.tarde
                          ? t.confirmaPierdePrueba.replace("{h}", String(c.horasCancelacion))
                          : t.confirmaConservaPrueba
                        : c.tarde
                          ? t.confirmaPierde.replace("{h}", String(c.horasCancelacion))
                          : t.confirmaDevuelve}
                    </p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button className={styles.boton} style={boton} onClick={() => cancelar(c)}>
                        {t.confirmar}
                      </button>
                      <button className={`${styles.boton} ${styles.botonSecundario}`} style={boton} onClick={() => setConfirmando(null)}>
                        {t.noCancelar}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}

      {saberMas && (
        <SaberMas
          titulo={saberMas}
          descripcion={(idioma === "en" ? descripciones[saberMas]?.en : null) || descripciones[saberMas]?.es || null}
          idioma={idioma}
          alCerrar={() => setSaberMas(null)}
        />
      )}

      {confirmada && (
        <ReservaConfirmada
          clase={confirmada}
          idioma={idioma}
          alVer={() => router.push("/clases/mis-reservas")}
          alVolver={() => setConfirmada(null)}
        />
      )}
    </main>
  );
}

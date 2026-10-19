"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Avatar from "../Avatar";
import BarraSuperior from "../BarraSuperior";
import { obtenerMisBonos, type MiBono } from "../cuenta/acciones";
import { useIdioma } from "../useIdioma";
import { useMiPerfil } from "../useMiPerfil";
import estilos from "./perfil.module.css";
import { obtenerFotos, quitarFoto, subirFoto } from "./acciones";
import { textosPerfil } from "./textosPerfil";
import { fechaCorta } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/client";

type Resumen = { dias_activo: number; reservas_tarifa: number; sesiones_semana: number; objetivo_semana: number };

type Datos = {
  nombre: string;
  email: string;
  foto: string | null;
  bonos: MiBono[];
  resumen: Resumen | null;
};

async function cargar(): Promise<Datos | null> {
  const supabase = createClient();
  const { data: sesion } = await supabase.auth.getUser();
  if (!sesion.user) return null;
  const { data: p } = await supabase
    .from("profiles")
    .select("id, email, nombre, apellidos")
    .eq("id", sesion.user.id)
    .maybeSingle();
  if (!p) return null;
  const [fotos, bonos, resumen] = await Promise.all([
    obtenerFotos([p.id]),
    obtenerMisBonos(),
    supabase.rpc("resumen_perfil"),
  ]);
  return {
    nombre: [p.nombre, p.apellidos].filter(Boolean).join(" "),
    email: p.email ?? "",
    foto: fotos[p.id] ?? null,
    bonos,
    resumen: resumen.error ? null : (resumen.data as Resumen | null),
  };
}

// Reduce la foto en el propio móvil: recorte cuadrado de 512 px, unos 50 KB.
async function prepararFoto(archivo: File): Promise<Blob> {
  const imagen = await createImageBitmap(archivo);
  const lado = Math.min(imagen.width, imagen.height);
  const lienzo = document.createElement("canvas");
  lienzo.width = 512;
  lienzo.height = 512;
  lienzo
    .getContext("2d")!
    .drawImage(imagen, (imagen.width - lado) / 2, (imagen.height - lado) / 2, lado, lado, 0, 0, 512, 512);
  return new Promise((resolver, rechazar) =>
    lienzo.toBlob((b) => (b ? resolver(b) : rechazar(new Error("sin imagen"))), "image/jpeg", 0.85),
  );
}

const DIA = 24 * 60 * 60 * 1000;

export default function Perfil() {
  const [idioma] = useIdioma();
  const t = textosPerfil[idioma];
  const mi = useMiPerfil();
  const [datos, setDatos] = useState<Datos | null>(null);
  const [opciones, setOpciones] = useState(false);
  const [foto, setFoto] = useState<"quieta" | "subiendo">("quieta");
  const [errorFoto, setErrorFoto] = useState(false);
  const [ahora] = useState(() => Date.now());

  useEffect(() => {
    cargar().then(setDatos);
  }, []);

  if (!datos || typeof mi !== "object" || mi === null) {
    return (
      <main className={estilos.perfilPagina}>
        <BarraSuperior />
        <p className={estilos.ayudaPerfil}>{t.cargando}</p>
      </main>
    );
  }

  const esAdmin = mi.rol === "admin";
  const online = mi.servicios.includes("online") || mi.planOnline;
  const presencial = mi.servicios.includes("grupal") || mi.servicios.includes("individual");
  const r = datos.resumen;

  async function elegirFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = "";
    if (!archivo) return;
    setErrorFoto(false);
    setFoto("subiendo");
    try {
      const f = new FormData();
      f.append("foto", new File([await prepararFoto(archivo)], "foto.jpg", { type: "image/jpeg" }));
      const res = await subirFoto(f);
      if (!res.ok) setErrorFoto(true);
    } catch {
      setErrorFoto(true);
    }
    setDatos(await cargar());
    setFoto("quieta");
    setOpciones(false);
  }

  async function sinFoto() {
    await quitarFoto();
    setDatos(await cargar());
    setOpciones(false);
  }

  const nombreServicio = (s: string) =>
    s === "online" ? t.servicioOnline : s === "individual" ? t.servicioIndividual : t.servicioGrupal;

  function barra(b: MiBono) {
    const activo = b.estado === "activo";
    let hecho = 0;
    let total = 1;
    let texto = "";
    if (b.servicio === "online") {
      const desde = b.activoDesde ? new Date(b.activoDesde).getTime() : null;
      const hasta = b.caducaEn ? new Date(b.caducaEn).getTime() : null;
      if (activo && desde !== null && hasta !== null) {
        total = Math.max(1, Math.round((hasta - desde) / DIA));
        hecho = Math.min(total, Math.max(0, Math.round((ahora - desde) / DIA)));
      }
      texto = `${hecho}/${total} ${t.diasDeTotal}`;
    } else {
      total = b.clasesTotal;
      hecho = total - b.clasesRestantes;
      texto = `${hecho}/${total} ${t.sesionesDeTotal}`;
    }
    return (
      <div key={b.id} className={estilos.bonoTarjeta}>
        <div className={estilos.bonoCabecera}>
          <strong>
            {!activo && `${t.siguiente}: `}
            {b.nombre || nombreServicio(b.servicio)}
          </strong>
          <span>{texto}</span>
        </div>
        <div
          className={estilos.barraFondo}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={hecho}
        >
          <div className={estilos.barraRelleno} style={{ width: `${Math.round((hecho / total) * 100)}%` }} />
        </div>
        <small>
          {nombreServicio(b.servicio)}
          {activo ? (b.caducaEn ? ` · ${t.caduca} ${fechaCorta(b.caducaEn, idioma)}` : "") : ` · ${t.enEspera}`}
        </small>
      </div>
    );
  }

  const segundo = online && !presencial
    ? { valor: r ? `${r.sesiones_semana}/${r.objetivo_semana}` : "—", etiqueta: `${t.sesiones} ${t.sesionesAyuda}` }
    : { valor: r ? String(r.reservas_tarifa) : "—", etiqueta: t.reservas };

  const opcionesLista: { href: string; texto: string; icono: string }[] = [
    { href: "/perfil/datos", texto: t.misDatos, icono: "👤" },
  ];
  if (!esAdmin && presencial) opcionesLista.push({ href: "/clases/mis-reservas", texto: t.historialClases, icono: "📅" });
  if (!esAdmin && online) opcionesLista.push({ href: "/rutina", texto: t.entrenamientos, icono: "🏋️" });
  opcionesLista.push({ href: "/perfil/calculadoras", texto: t.calculadoras, icono: "🧮" });
  opcionesLista.push({ href: "/perfil/contrasena", texto: t.cambiarContrasena, icono: "🔒" });

  return (
    <main className={estilos.perfilPagina}>
      <BarraSuperior />
      <h1 className={estilos.perfilTitulo}>{t.titulo}</h1>

      <section className={estilos.cabecera}>
        <button
          type="button"
          className={estilos.fotoBoton}
          onClick={() => setOpciones((o) => !o)}
          aria-expanded={opciones}
          aria-label={t.fotoOpciones}
        >
          <Avatar nombre={datos.nombre} url={datos.foto} tamano={116} />
        </button>
        {opciones && (
          <div className={estilos.fotoOpciones} role="group" aria-label={t.fotoOpciones}>
            <label className={estilos.opcionFoto}>
              {foto === "subiendo" ? t.fotoSubiendo : datos.foto ? t.fotoCambiar : t.fotoPoner}
              <input type="file" accept="image/*" hidden disabled={foto === "subiendo"} onChange={elegirFoto} />
            </label>
            {datos.foto && (
              <button type="button" className={estilos.opcionFoto} onClick={sinFoto}>
                {t.fotoEliminar}
              </button>
            )}
            <button type="button" className={estilos.opcionFoto} onClick={() => setOpciones(false)}>
              {t.fotoCancelar}
            </button>
          </div>
        )}
        {errorFoto && <p className={estilos.errorPerfil}>{t.fotoError}</p>}
        <h2 className={estilos.nombre}>{datos.nombre || datos.email}</h2>
        <p className={estilos.correo}>{datos.email}</p>
      </section>

      {!esAdmin && (
        <section className={estilos.numeros}>
          <div>
            <strong>{r ? r.dias_activo : "—"}</strong>
            <span>{t.diasActivo}</span>
          </div>
          <div>
            <strong>{segundo.valor}</strong>
            <span>{segundo.etiqueta}</span>
          </div>
          <div>
            <strong>0</strong>
            <span>{t.cursos}</span>
          </div>
        </section>
      )}

      {!esAdmin && (
        <section className={estilos.bonos}>
          <h2>{t.contratado}</h2>
          {datos.bonos.length === 0 && <p className={estilos.ayudaPerfil}>{t.sinBonos}</p>}
          {datos.bonos.map(barra)}
          <Link href="/pagos" className={estilos.enlaceSuave}>
            {t.verPagos} →
          </Link>
        </section>
      )}

      <nav className={estilos.lista} aria-label={t.titulo}>
        {opcionesLista.map((o) => (
          <Link key={o.href} href={o.href} className={estilos.fila}>
            <span aria-hidden="true">{o.icono}</span>
            <span className={estilos.filaTexto}>{o.texto}</span>
            <span aria-hidden="true">›</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}

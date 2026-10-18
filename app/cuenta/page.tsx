"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BarraSuperior from "../BarraSuperior";
import styles from "../formularios.module.css";
import { textos, type ClaveTexto } from "../textos";
import { useIdioma } from "../useIdioma";
import { fechaCorta } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/client";
import { obtenerMisBonos, type MiBono } from "./acciones";

type Cuenta = { nombre: string; rol: string; servicios: string[]; bonos: MiBono[] };

export default function MiCuenta() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const router = useRouter();
  const [cuenta, setCuenta] = useState<Cuenta | null>(null);

  useEffect(() => {
    async function cargar() {
      const supabase = createClient();
      const { data: sesion } = await supabase.auth.getUser();
      if (!sesion.user) return router.replace("/entrar");

      const { data: perfil } = await supabase
        .from("profiles")
        .select("nombre, rol, datos_completos")
        .eq("id", sesion.user.id)
        .maybeSingle();

      const { data: consentimientos } = await supabase
        .from("consentimientos")
        .select("tipo")
        .eq("user_id", sesion.user.id);
      const tipos = new Set((consentimientos ?? []).map((c) => c.tipo));

      // Hasta tener los datos y las aceptaciones no se puede avanzar.
      if (
        !perfil ||
        !perfil.datos_completos ||
        !tipos.has("privacidad") ||
        !tipos.has("terminos")
      ) {
        return router.replace("/datos");
      }

      const { data: servicios } = await supabase
        .from("perfil_servicios")
        .select("servicio")
        .eq("user_id", sesion.user.id);

      const bonos = await obtenerMisBonos();

      setCuenta({
        nombre: perfil.nombre ?? "",
        rol: perfil.rol,
        servicios: (servicios ?? []).map((s) => s.servicio),
        bonos,
      });
    }
    cargar();
  }, [router]);

  async function salir() {
    await createClient().auth.signOut();
    router.push("/");
  }

  return (
    <main className={styles.pagina}>
      <BarraSuperior />
      {cuenta ? (
        <>
          <div className={styles.cabecera}>
            <h1>
              {t.hola}, {cuenta.nombre}
            </h1>
          </div>
          <div className={styles.tarjeta}>
            <div>
              <strong>{t.tuRol}</strong>
              <p className={styles.aviso}>{t[`rol_${cuenta.rol}` as ClaveTexto]}</p>
            </div>
            <div>
              <strong>{t.tusServicios}</strong>
              {cuenta.servicios.length > 0 ? (
                <ul className={styles.lista}>
                  {cuenta.servicios.map((s) => (
                    <li key={s}>{t[`servicio_${s}` as ClaveTexto]}</li>
                  ))}
                </ul>
              ) : (
                <p className={styles.ayuda}>{t.sinServicios}</p>
              )}
            </div>
            {(cuenta.rol === "alumno" || cuenta.bonos.length > 0) && (
              <div>
                <strong>{t.miBono}</strong>
                {cuenta.bonos.length === 0 && <p className={styles.ayuda}>{t.sinBono}</p>}
                {cuenta.bonos.map((b) => (
                  <div key={b.id} className={styles.aviso} style={{ marginTop: 8 }}>
                    <div>
                      <strong>
                        {b.estado === "en_cola" ? `${t.siguienteBono}: ` : ""}
                        {b.nombre}
                      </strong>
                    </div>
                    {b.servicio === "online" ? (
                      b.estado === "activo" ? (
                        <div>
                          {t.planOnline}
                          {b.caducaEn && ` · ${t.caducaEl} ${fechaCorta(b.caducaEn, idioma)}`}
                        </div>
                      ) : (
                        <div>
                          {t.planOnline} · {t.enEspera}
                        </div>
                      )
                    ) : b.estado === "activo" ? (
                      <div>
                        {b.clasesRestantes} {t.clasesDeTotal} {b.clasesTotal} {t.clasesRestantes}
                        {b.caducaEn && ` · ${t.caducaEl} ${fechaCorta(b.caducaEn, idioma)}`}
                      </div>
                    ) : (
                      <div>
                        {b.clasesRestantes} {t.clasesDeTotal} {b.clasesTotal} {t.clasesRestantes} ·{" "}
                        {t.enEspera}
                      </div>
                    )}
                    {b.pagoPendiente && <div>{t.pagoPendiente}</div>}
                  </div>
                ))}
              </div>
            )}
            <Link href="/clases" className={styles.boton}>
              {t.verHorario}
            </Link>
            {cuenta.bonos.some((b) => b.servicio === "online") && (
              <Link href="/rutina" className={styles.boton}>
                {t.miRutina}
              </Link>
            )}
            <p className={styles.ayuda}>{t.proximamente}</p>
            {cuenta.rol === "admin" && (
              <Link href="/admin" className={styles.boton}>
                {t.panelAdmin}
              </Link>
            )}
            <button
              className={`${styles.boton} ${styles.botonSecundario}`}
              onClick={salir}
            >
              {t.salir}
            </button>
          </div>
        </>
      ) : (
        <p className={styles.aviso}>{t.cargando}</p>
      )}
    </main>
  );
}

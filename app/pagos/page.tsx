"use client";

import { useEffect, useState } from "react";
import BarraSuperior from "../BarraSuperior";
import styles from "../formularios.module.css";
import estilos from "../perfil/perfil.module.css";
import { textos, type ClaveTexto } from "../textos";
import { useIdioma } from "../useIdioma";
import { fechaCorta } from "@/lib/fechas";
import { createClient } from "@/lib/supabase/client";

type Pago = {
  id: string;
  importe_centimos: number;
  importe_original_centimos: number | null;
  descuento_centimos: number;
  metodo: string;
  estado: string;
  creado_en: string;
  pagado_en: string | null;
  bonos: { tipos_bono: { nombre: string } | null } | null;
};

export default function MisPagos() {
  const [idioma] = useIdioma();
  const t = textos[idioma];
  const [pagos, setPagos] = useState<Pago[] | null>(null);

  useEffect(() => {
    createClient()
      .from("pagos")
      .select(
        "id, importe_centimos, importe_original_centimos, descuento_centimos, metodo, estado, creado_en, pagado_en, bonos(tipos_bono(nombre))",
      )
      .order("creado_en", { ascending: false })
      .then(({ data }) => setPagos((data ?? []) as unknown as Pago[]));
  }, []);

  const euros = (c: number) =>
    new Intl.NumberFormat(idioma === "en" ? "en-GB" : "es-ES", { style: "currency", currency: "EUR" }).format(c / 100);

  return (
    <main className={styles.pagina}>
      <BarraSuperior />
      <div className={styles.cabecera}>
        <h1>{t.navPagos}</h1>
      </div>

      {pagos === null && <p className={styles.aviso}>{t.cargando}</p>}
      {pagos?.length === 0 && <p className={styles.aviso}>{t.sinPagos}</p>}

      <ul className={estilos.tablaPagos}>
        {pagos?.map((p) => (
          <li key={p.id} className={estilos.pago}>
            <div>
              <strong>{p.bonos?.tipos_bono?.nombre ?? t.pagoSinBono}</strong>
              <small>
                {fechaCorta(p.pagado_en ?? p.creado_en, idioma)} · {t[`metodo_${p.metodo}` as ClaveTexto]}
              </small>
              {p.descuento_centimos > 0 && p.importe_original_centimos !== null && (
                <small>
                  {t.precioLabel} {euros(p.importe_original_centimos)} − {t.descuentoLabel}{" "}
                  {euros(p.descuento_centimos)}
                </small>
              )}
            </div>
            <div className={estilos.pagoDerecha}>
              <strong>{euros(p.importe_centimos)}</strong>
              <small>
                <span className={`${estilos.etiqueta} ${p.estado === "pagado" ? estilos.etiquetaOk : ""}`}>
                  {t[`pagoEstado_${p.estado}` as ClaveTexto]}
                </span>
              </small>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}

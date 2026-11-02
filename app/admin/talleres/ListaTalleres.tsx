"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CancelarClaseAdmin from "../../clases/CancelarClaseAdmin";
import { textoDia, textoHora } from "@/lib/fechas";
import { enlaceGoogleCalendar, horaFin, textoDatosTaller } from "@/lib/taller";
import styles from "../admin.module.css";
import comunes from "../comunes/comunes.module.css";
import Nuevo from "../comunes/Nuevo";
import PanelCompleto from "../comunes/PanelCompleto";
import FormularioTaller, { type TallerForm } from "./FormularioTaller";

export type TallerFila = {
  id: string;
  nombre: string;
  empieza_en: string;
  dia: string; // AAAA-MM-DD
  duracion_min: number;
  plazas: number;
  apuntados: number;
  cancelado: boolean;
  pasado: boolean;
  modalidad: "presencial" | "online";
  ubicacion: string | null;
  enlace: string | null;
};

function Tarjeta({ t, hoy }: { t: TallerFila; hoy: string }) {
  const router = useRouter();
  const [editando, setEditando] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const datos = { nombre: t.nombre, empieza_en: t.empieza_en, duracion_min: t.duracion_min, modalidad: t.modalidad, ubicacion: t.ubicacion, enlace: t.enlace };
  const texto = textoDatosTaller(datos);
  const formulario: TallerForm = {
    sesionId: t.id,
    nombre: t.nombre,
    fecha: t.dia,
    hora: textoHora(t.empieza_en),
    duracion: t.duracion_min,
    plazas: t.plazas,
    modalidad: t.modalidad,
    ubicacion: t.ubicacion ?? "",
    enlace: t.enlace ?? "",
  };

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      window.prompt("Copia estos datos:", texto);
    }
  }

  return (
    <div className={comunes.fila} style={{ flexDirection: "column", alignItems: "stretch", gap: 8 }}>
      <div>
        <strong>{t.nombre}</strong>
        {t.cancelado && " (cancelado)"}
        <div className={styles.ayuda}>
          {textoDia(t.empieza_en)} · {textoHora(t.empieza_en)} – {horaFin(datos)} ({t.duracion_min} min)
        </div>
        <div className={styles.ayuda}>
          {t.modalidad === "online" ? `Online${t.enlace ? ` · ${t.enlace}` : ""}` : `Presencial · ${t.ubicacion || "sin ubicación"}`}
        </div>
        <div className={styles.ayuda}>
          {t.apuntados}/{t.plazas} plazas ocupadas
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Link href={`/admin/reservas?dia=${t.dia}`} className={`${styles.boton} ${styles.botonSecundario}`}>
          Ver asistentes
        </Link>
        <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={copiar}>
          {copiado ? "¡Copiado!" : "Copiar datos"}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer" className={`${styles.boton} ${styles.botonSecundario}`}>
          Enviar por WhatsApp
        </a>
        <a href={enlaceGoogleCalendar(datos)} target="_blank" rel="noopener noreferrer" className={`${styles.boton} ${styles.botonSecundario}`}>
          Google Calendar
        </a>
        {!t.cancelado && (
          <button type="button" className={`${styles.boton} ${styles.botonSecundario}`} onClick={() => setEditando(true)}>
            Editar
          </button>
        )}
      </div>
      {!t.cancelado && !t.pasado && <CancelarClaseAdmin sesionId={t.id} personas={t.apuntados} alTerminar={() => router.refresh()} />}
      {editando && (
        <PanelCompleto titulo={`Editar ${t.nombre}`} cerrar={() => setEditando(false)}>
          <FormularioTaller taller={formulario} hoy={hoy} alTerminar={() => { setEditando(false); router.refresh(); }} />
        </PanelCompleto>
      )}
    </div>
  );
}

// Los talleres: próximos y pasados, con crear uno nuevo arriba.
export default function ListaTalleres({ proximos, pasados, hoy }: { proximos: TallerFila[]; pasados: TallerFila[]; hoy: string }) {
  const router = useRouter();
  return (
    <div>
      <div className={comunes.barra}>
        <Nuevo
          etiqueta="Nuevo taller"
          titulo="Nuevo taller"
          render={(cerrar) => (
            <FormularioTaller
              hoy={hoy}
              alTerminar={() => {
                cerrar();
                router.refresh();
              }}
            />
          )}
        />
      </div>
      <h2>Próximos</h2>
      {proximos.length === 0 && <p className={comunes.sinResultados}>No hay talleres próximos.</p>}
      {proximos.map((t) => (
        <Tarjeta key={t.id} t={t} hoy={hoy} />
      ))}
      {pasados.length > 0 && (
        <details>
          <summary style={{ minHeight: 44, cursor: "pointer", fontWeight: 700 }}>Pasados ({pasados.length})</summary>
          {pasados.map((t) => (
            <Tarjeta key={t.id} t={t} hoy={hoy} />
          ))}
        </details>
      )}
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CancelarClaseAdmin from "../../clases/CancelarClaseAdmin";
import { textoDia, textoHora } from "@/lib/fechas";
import { enlaceGoogleCalendar, horaFin, textoDatosTaller } from "@/lib/taller";
import styles from "../admin.module.css";
import comunes from "../comunes/comunes.module.css";
import estilos from "./talleres.module.css";
import { IconoCalendario, IconoCheck, IconoCompartir, IconoCopiar, IconoLapiz, IconoPapelera, IconoPerfil } from "./Iconos";
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
  const [cancelando, setCancelando] = useState(false);
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
    <div className={estilos.tarjeta}>
      <div className={estilos.texto}>
        <strong>
          {t.nombre}
          {t.cancelado && " (cancelado)"}
        </strong>
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
      <div className={estilos.iconos}>
        <Link href={`/admin/reservas?dia=${t.dia}`} className={estilos.icono} aria-label="Ver asistentes" title="Ver asistentes">
          <IconoPerfil />
        </Link>
        <button type="button" className={estilos.icono} onClick={copiar} aria-label="Copiar datos" title="Copiar datos">
          {copiado ? <IconoCheck /> : <IconoCopiar />}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(texto)}`} target="_blank" rel="noopener noreferrer" className={estilos.icono} aria-label="Enviar por WhatsApp" title="Enviar por WhatsApp">
          <IconoCompartir />
        </a>
        <a href={enlaceGoogleCalendar(datos)} target="_blank" rel="noopener noreferrer" className={estilos.icono} aria-label="Añadir a Google Calendar" title="Añadir a Google Calendar">
          <IconoCalendario />
        </a>
        {!t.cancelado && (
          <button type="button" className={estilos.icono} onClick={() => setEditando(true)} aria-label="Editar" title="Editar">
            <IconoLapiz />
          </button>
        )}
        {!t.cancelado && !t.pasado && (
          <button type="button" className={`${estilos.icono} ${estilos.peligro}`} onClick={() => setCancelando((c) => !c)} aria-expanded={cancelando} aria-label="Cancelar el taller" title="Cancelar el taller">
            <IconoPapelera />
          </button>
        )}
      </div>
      {cancelando && (
        <div className={estilos.debajo}>
          <CancelarClaseAdmin sesionId={t.id} personas={t.apuntados} sinBoton alTerminar={() => router.refresh()} />
        </div>
      )}
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

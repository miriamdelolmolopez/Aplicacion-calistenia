import Image from "next/image";
import styles from "./logoMarca.module.css";

// Logo de CalisCoach con letras. Se ven las del logo claro, y en el tema oscuro las del logo oscuro.
// El tamaño lo pone quien lo usa, con `className` (la imagen mantiene sus proporciones).
export default function LogoMarca({ className = "", prioridad = false, tamanos = "300px" }: { className?: string; prioridad?: boolean; tamanos?: string }) {
  return (
    <>
      <Image src="/logos/logo-modo-claro.png" alt="CalisCoach" width={1251} height={599} sizes={tamanos} priority={prioridad} className={`${styles.claro} ${className}`} />
      <Image src="/logos/logo-modo-oscuro.png" alt="" aria-hidden="true" width={1251} height={599} sizes={tamanos} priority={prioridad} className={`${styles.oscuro} ${className}`} />
    </>
  );
}

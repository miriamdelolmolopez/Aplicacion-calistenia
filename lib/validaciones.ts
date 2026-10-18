const LETRAS = "TRWAGMYFPDXBNJZSQVHLCKE";
const NIE: Record<string, string> = { X: "0", Y: "1", Z: "2" };

export function normalizarDni(valor: string): string {
  return valor.toUpperCase().replace(/[\s-]/g, "");
}

// DNI: 8 números + letra. NIE: X, Y o Z + 7 números + letra. Se comprueba la letra.
export function dniNieValido(valor: string): boolean {
  const s = normalizarDni(valor);
  if (/^\d{8}[A-Z]$/.test(s)) {
    return LETRAS[parseInt(s.slice(0, 8), 10) % 23] === s[8];
  }
  if (/^[XYZ]\d{7}[A-Z]$/.test(s)) {
    const numero = NIE[s[0]] + s.slice(1, 8);
    return LETRAS[parseInt(numero, 10) % 23] === s[8];
  }
  return false;
}

export function telefonoValido(valor: string): boolean {
  return /^\+?\d{9,15}$/.test(valor.replace(/[\s.-]/g, ""));
}

export function emailValido(valor: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim());
}

export function fechaNacimientoValida(valor: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const fecha = new Date(valor + "T00:00:00");
  if (Number.isNaN(fecha.getTime())) return false;
  return fecha <= new Date() && fecha.getFullYear() >= 1900;
}

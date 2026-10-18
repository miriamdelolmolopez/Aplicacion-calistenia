// IMC (índice de masa corporal) = peso (kg) / altura (m) al cuadrado.
// Categorías de la OMS para personas adultas: no dependen del sexo ni de la edad.
export type CategoriaImc = "bajo" | "normal" | "sobrepeso" | "obesidad";

export function calcularImc(pesoKg: number, alturaCm: number): number {
  const m = alturaCm / 100;
  return Math.round((pesoKg / (m * m)) * 10) / 10;
}

export function categoriaImc(imc: number): CategoriaImc {
  if (imc < 18.5) return "bajo";
  if (imc < 25) return "normal";
  if (imc < 30) return "sobrepeso";
  return "obesidad";
}

// Años cumplidos a una fecha (la de hoy si no se indica otra).
export function edadDe(fechaNacimiento: string, hoy: Date = new Date()): number {
  const nac = new Date(fechaNacimiento + "T00:00:00");
  let edad = hoy.getFullYear() - nac.getFullYear();
  const aunNoCumple =
    hoy.getMonth() < nac.getMonth() || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate());
  if (aunNoCumple) edad--;
  return edad;
}

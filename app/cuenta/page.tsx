import { redirect } from "next/navigation";

// «Mi cuenta» ahora es «Perfil». Se mantiene la dirección antigua para los enlaces que ya existen.
export default function Cuenta() {
  redirect("/perfil");
}

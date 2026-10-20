import DocumentoLegal from "../DocumentoLegal";

export const metadata = { title: "Aviso legal · Legal notice" };

export default function Pagina() {
  return <DocumentoLegal documento="aviso-legal" />;
}

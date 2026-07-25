import { redirect } from "next/navigation";

// Rota raiz do Catálogo pro redireciona para Produtos (primeira aba).
export default function CatalogoProIndex() {
  redirect("/catalogo-pro/produtos");
}

import { loadVariantAxes, loadVariantValues, requireUserId } from "../data";
import { VariacoesClient } from "./variacoes-client";

// Aba Variações: gerencia variant_axes (Cor, Tamanho, etc.) e seus valores.
export default async function VariacoesPage() {
  const { userId } = await requireUserId();
  const [axes, values] = await Promise.all([
    loadVariantAxes(userId),
    loadVariantValues(userId)
  ]);

  return <VariacoesClient axes={axes} userId={userId} values={values} />;
}

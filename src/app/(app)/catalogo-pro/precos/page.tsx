import { loadPriceLists, requireUserId } from "../data";
import { PrecosClient } from "./precos-client";

// Aba Listas de preço: CRUD de price_lists (nome + amount_mode). A atribuição
// de preços por item (item_prices) fica para próxima rodada.
export default async function PrecosPage() {
  const { userId } = await requireUserId();
  const priceLists = await loadPriceLists(userId);
  return <PrecosClient priceLists={priceLists} userId={userId} />;
}

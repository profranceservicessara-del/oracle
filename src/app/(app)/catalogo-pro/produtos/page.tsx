import { loadAccountingCodes, loadCategories, loadItems, requireUserId } from "../data";
import { ItemsClient } from "../items-client";

// Aba Produtos: lista catalog_items com item_kind='product'. Não filtra por
// archived no servidor (a UI faz o toggle Ativos/Arquivados/Todos).
export default async function ProdutosPage() {
  const { userId } = await requireUserId();
  const [items, categories, accountingCodes] = await Promise.all([
    loadItems(userId, { kind: "product" }),
    loadCategories(userId),
    loadAccountingCodes()
  ]);

  return (
    <ItemsClient
      accountingCodes={accountingCodes}
      categories={categories}
      items={items}
      kind="product"
      userId={userId}
    />
  );
}

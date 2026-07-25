import { loadAccountingCodes, loadCategories, loadItems, requireUserId } from "../data";
import { ItemsClient } from "../items-client";

// Aba Serviços: lista catalog_items com item_kind='service'.
export default async function ServicosPage() {
  const { userId } = await requireUserId();
  const [items, categories, accountingCodes] = await Promise.all([
    loadItems(userId, { kind: "service" }),
    loadCategories(userId),
    loadAccountingCodes()
  ]);

  return (
    <ItemsClient
      accountingCodes={accountingCodes}
      categories={categories}
      items={items}
      kind="service"
      userId={userId}
    />
  );
}

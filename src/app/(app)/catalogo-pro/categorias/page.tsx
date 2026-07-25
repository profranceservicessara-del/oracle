import { loadCategories, loadItems, requireUserId } from "../data";
import { CategoriasClient } from "./categorias-client";

// Aba Categorias: árvore de item_categories + contagem de itens por categoria
// (necessária para bloquear exclusão quando houver vínculo).
export default async function CategoriasPage() {
  const { userId } = await requireUserId();
  const [categories, items] = await Promise.all([
    loadCategories(userId),
    loadItems(userId)
  ]);

  const counts = new Map<string, number>();
  items.forEach((it) => {
    if (it.category_id) counts.set(it.category_id, (counts.get(it.category_id) ?? 0) + 1);
  });

  return (
    <CategoriasClient
      categories={categories}
      itemCounts={Object.fromEntries(counts)}
      userId={userId}
    />
  );
}

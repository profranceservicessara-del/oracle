import {
  loadCategories,
  loadItems,
  loadPromotionTargets,
  loadPromotions,
  requireUserId
} from "../data";
import { PromocoesClient } from "./promocoes-client";

// Aba Promoções: promotions + promotion_targets. Também carrega itens e
// categorias para o multi-select de alvos.
export default async function PromocoesPage() {
  const { userId } = await requireUserId();
  const [promotions, targets, items, categories] = await Promise.all([
    loadPromotions(userId),
    loadPromotionTargets(userId),
    loadItems(userId),
    loadCategories(userId)
  ]);

  return (
    <PromocoesClient
      categories={categories}
      items={items}
      promotions={promotions}
      targets={targets}
      userId={userId}
    />
  );
}

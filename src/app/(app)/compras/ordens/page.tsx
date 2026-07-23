import { loadComprasData } from "../data";
import { DocumentList } from "../document-list";

export default async function OrdensPage() {
  const { initialDocs, suppliers, accountingCodes, userId } = await loadComprasData("order");
  return (
    <DocumentList
      accountingCodes={accountingCodes}
      initialDocs={initialDocs}
      suppliers={suppliers}
      type="order"
      userId={userId}
    />
  );
}

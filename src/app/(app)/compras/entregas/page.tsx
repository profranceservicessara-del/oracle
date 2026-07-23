import { loadComprasData } from "../data";
import { DocumentList } from "../document-list";

export default async function EntregasPage() {
  const { initialDocs, suppliers, accountingCodes, userId } = await loadComprasData("delivery");
  return (
    <DocumentList
      accountingCodes={accountingCodes}
      initialDocs={initialDocs}
      suppliers={suppliers}
      type="delivery"
      userId={userId}
    />
  );
}

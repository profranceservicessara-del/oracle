import { loadComprasData } from "../data";
import { DocumentList } from "../document-list";

export default async function FaturasPage() {
  const { initialDocs, suppliers, accountingCodes, userId } = await loadComprasData("invoice");
  return (
    <DocumentList
      accountingCodes={accountingCodes}
      initialDocs={initialDocs}
      suppliers={suppliers}
      type="invoice"
      userId={userId}
    />
  );
}

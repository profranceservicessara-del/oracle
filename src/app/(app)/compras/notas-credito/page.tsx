import { loadComprasData } from "../data";
import { DocumentList } from "../document-list";

export default async function NotasCreditoPage() {
  const { initialDocs, suppliers, accountingCodes, userId } = await loadComprasData("credit_note");
  return (
    <DocumentList
      accountingCodes={accountingCodes}
      initialDocs={initialDocs}
      suppliers={suppliers}
      type="credit_note"
      userId={userId}
    />
  );
}

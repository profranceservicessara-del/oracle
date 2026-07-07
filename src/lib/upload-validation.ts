// Validação client-side de uploads antes de enviar ao Supabase Storage.
// Fonte única de MIME/tamanho por contexto; mensagens seguras (sem vazar paths).

export type UploadContext = "avatar" | "logo" | "document";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];
const DOCUMENT_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
];

const MB = 1024 * 1024;

const UPLOAD_CONFIG: Record<UploadContext, { types: string[]; maxBytes: number; label: string }> = {
  avatar: { types: IMAGE_TYPES, maxBytes: 2 * MB, label: "2 MB" },
  logo: { types: IMAGE_TYPES, maxBytes: 3 * MB, label: "3 MB" },
  document: { types: DOCUMENT_TYPES, maxBytes: 10 * MB, label: "10 MB" }
};

// Retorna mensagem de erro (pt-BR) ou null se o arquivo é válido.
export function validateUpload(file: File | null | undefined, context: UploadContext): string | null {
  const config = UPLOAD_CONFIG[context] ?? UPLOAD_CONFIG.document; // fallback seguro
  if (!file) {
    return "Formato de arquivo não permitido.";
  }
  const type = file.type || ""; // fallback: sem type -> não passa no allowlist
  if (!config.types.includes(type)) {
    return "Formato de arquivo não permitido.";
  }
  const size = Number(file.size) || 0;
  if (size > config.maxBytes) {
    return `Arquivo muito grande. Tamanho máximo: ${config.label}.`;
  }
  return null;
}

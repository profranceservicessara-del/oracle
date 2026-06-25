// CRM Core (Phase 1) types — mirror of the crm_* tables.
// Additive, company-based model. Does not affect the existing invoicing types.

export type CrmMemberRole = "owner" | "admin" | "member";
export type CrmClientType = "particulier" | "professionnel";
export type CrmDossierStatus = "open" | "in_progress" | "closed";
export type CrmTaskStatus = "todo" | "doing" | "done";
export type AppLocale = "fr" | "pt";

export type CrmCompany = {
  id: string;
  owner_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type CrmCompanyMember = {
  id: string;
  company_id: string;
  user_id: string;
  role: CrmMemberRole;
  created_at: string;
};

export type CrmClient = {
  id: string;
  company_id: string;
  type: CrmClientType;
  name: string;
  email: string | null;
  phone: string | null;
  archived: boolean;
  /** Bridge to the invoicing `clients` table (Phase 6). Null until first invoice. */
  client_id: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmContact = {
  id: string;
  company_id: string;
  client_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmDossier = {
  id: string;
  company_id: string;
  client_id: string | null;
  title: string;
  status: CrmDossierStatus;
  created_at: string;
  updated_at: string;
};

export type CrmNote = {
  id: string;
  company_id: string;
  client_id: string | null;
  dossier_id: string | null;
  author_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
};

export type CrmTask = {
  id: string;
  company_id: string;
  client_id: string | null;
  dossier_id: string | null;
  assignee_id: string | null;
  title: string;
  status: CrmTaskStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

export type CrmDocument = {
  id: string;
  company_id: string;
  client_id: string | null;
  dossier_id: string | null;
  name: string;
  storage_path: string | null;
  mime_type: string | null;
  created_at: string;
};

export type CrmActivityLog = {
  id: string;
  company_id: string;
  profile_id: string;
  action: string;
  entity: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
};

export type UserPreferences = {
  user_id: string;
  locale: AppLocale;
  theme: string;
  payload: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

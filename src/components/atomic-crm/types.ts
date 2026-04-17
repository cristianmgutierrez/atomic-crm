import type { Identifier, RaRecord } from "ra-core";
import type { ComponentType } from "react";

import type {
  COMPANY_CREATED,
  CONTACT_CREATED,
  DEAL_CREATED,
  TASK_CREATED,
  TASK_DONE,
} from "./consts";

export type SignUpData = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
};

export type SalesFormData = {
  avatar?: string;
  email: string;
  password?: string;
  first_name: string;
  last_name: string;
  administrator: boolean;
  disabled: boolean;
  escritorio_id?: Identifier;
  papel?: "gestor" | "assessor";
};

export type Sale = {
  first_name: string;
  last_name: string;
  administrator: boolean;
  avatar?: RAFile;
  disabled?: boolean;
  user_id: string;
  escritorio_id?: Identifier;
  papel?: "gestor" | "assessor";

  /**
   * This is a copy of the user's email, to make it easier to handle by react admin
   * DO NOT UPDATE this field directly, it should be updated by the backend
   */
  email: string;

  /**
   * This is used by the fake rest provider to store the password
   * DO NOT USE this field in your code besides the fake rest provider
   * @deprecated
   */
  password?: string;
} & Pick<RaRecord, "id">;

export type Escritorio = {
  name: string;
  created_at: string;
} & Pick<RaRecord, "id">;

export type Company = {
  name: string;
  logo: RAFile;
  sector: string;
  size: 1 | 10 | 50 | 250 | 500;
  linkedin_url: string;
  website: string;
  phone_number: string;
  address: string;
  zipcode: string;
  city: string;
  state_abbr: string;
  sales_id?: Identifier;
  created_at: string;
  description: string;
  revenue: string;
  tax_identifier: string;
  country: string;
  context_links?: string[];
  nb_contacts?: number;
  nb_deals?: number;
} & Pick<RaRecord, "id">;

export type EmailAndType = {
  email: string;
  type: "Work" | "Home" | "Other";
};

export type PhoneNumberAndType = {
  number: string;
  type: "Work" | "Home" | "Other";
};

export type Contact = {
  first_name: string;
  last_name: string;
  title: string;
  company_id?: Identifier | null;
  email_jsonb: EmailAndType[];
  avatar?: Partial<RAFile>;
  linkedin_url?: string | null;
  first_seen: string;
  last_seen: string;
  has_newsletter: boolean;
  tags: Identifier[];
  gender: string;
  sales_id?: Identifier;
  status: string;
  background: string;
  phone_jsonb: PhoneNumberAndType[];
  nb_tasks?: number;
  company_name?: string;
  // Aba 1: Informações Pessoais
  alias?: string | null;
  person_type?: string | null;
  document?: string | null;
  date_of_birth?: string | null;
  xp_code?: string | null;
  monthly_income?: number | null;
  website?: string | null;
  // Aba 2: Perfil do Investidor
  segment?: string | null;
  investor_profile?: string | null;
  declared_wealth?: number | null;
  xp_account_type?: string | null;
  xp_international?: boolean | null;
  investment_horizon?: string | null;
  financial_goal?: string | null;
  relationship_start_date?: string | null;
  xp_code_2?: string | null;
  mb_code?: string | null;
  avenue_code?: string | null;
  origin?: string | null;
  referred_by?: string | null;
  cross_sell_opportunities?: string[] | null;
  internal_notes?: string | null;
  // Aba 3: Endereço
  zip_code?: string | null;
  address?: string | null;
  address_number?: string | null;
  address_complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  address_notes?: string | null;
} & Pick<RaRecord, "id">;

export type Pipeline = {
  name: string;
  stages: DealStage[];
  pipeline_statuses: string[];
  position: number;
  created_at: string;
  escritorio_id?: Identifier;
} & Pick<RaRecord, "id">;

export type Deal = {
  name: string;
  company_id: Identifier;
  contact_ids: Identifier[];
  category: string;
  stage: string;
  pipeline_id: Identifier;
  description: string;
  amount: number;
  created_at: string;
  updated_at: string;
  archived_at?: string;
  expected_closing_date: string;
  sales_id: Identifier;
  index: number;
} & Pick<RaRecord, "id">;

export type Tag = {
  id: number;
  name: string;
  color: string;
};

export type TaskType = {
  value: string;
  label: string;
  icon?: string;
};

export interface CalendarSettings {
  slotInterval: 15 | 30 | 60;
  dayStartHour: number;
  dayEndHour: number;
  weekStartsOn: 0 | 1;
  defaultDurationMin: number;
}

export type Task = {
  contact_id: Identifier;
  type: string;
  text?: string | null;
  due_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  end_date?: string | null;
  notes?: string | null;
  deal_id?: Identifier | null;
  done_date?: string | null;
  sales_id?: Identifier;
  source?: string | null;
  attachments?: AttachmentNote[] | null;
  created_at?: string;
} & Pick<RaRecord, "id">;

export type ActivityCompanyCreated = {
  type: typeof COMPANY_CREATED;
  company_id: Identifier;
  company: Company;
  sales_id: Identifier;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityContactCreated = {
  type: typeof CONTACT_CREATED;
  company_id: Identifier;
  sales_id?: Identifier;
  contact: Contact;
  date: string;
} & Pick<RaRecord, "id">;

export type ActivityDealCreated = {
  type: typeof DEAL_CREATED;
  company_id: Identifier;
  sales_id?: Identifier;
  deal: Deal;
  date: string;
};

export type ActivityTaskCreated = {
  type: typeof TASK_CREATED;
  company_id?: Identifier | null;
  sales_id?: Identifier;
  task: Task;
  date: string;
};

export type ActivityTaskDone = {
  type: typeof TASK_DONE;
  company_id?: Identifier | null;
  sales_id?: Identifier;
  task: Task;
  date: string;
};

export type Activity = RaRecord &
  (
    | ActivityCompanyCreated
    | ActivityContactCreated
    | ActivityDealCreated
    | ActivityTaskCreated
    | ActivityTaskDone
  );

export interface RAFile {
  src: string;
  title: string;
  path?: string;
  rawFile: File;
  type?: string;
}

export type AttachmentNote = RAFile;

export interface LabeledValue {
  value: string;
  label: string;
}

export type DealStage = LabeledValue;

export interface ContactStatus extends LabeledValue {
  color: string;
}

export interface ContactGender {
  value: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
}

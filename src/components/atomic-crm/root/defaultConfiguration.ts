import type { ConfigurationContextValue } from "./ConfigurationContext";
import type { TaskType } from "../types";

export const defaultDarkModeLogo = "./logos/logo_atomic_crm_dark.svg";
export const defaultLightModeLogo = "./logos/logo_atomic_crm_light.svg";

export const defaultCurrency = "USD";

export const defaultTitle = "EuInvisto.club";

export const defaultCompanySectors = [
  { value: "communication-services", label: "Communication Services" },
  { value: "consumer-discretionary", label: "Consumer Discretionary" },
  { value: "consumer-staples", label: "Consumer Staples" },
  { value: "energy", label: "Energy" },
  { value: "financials", label: "Financials" },
  { value: "health-care", label: "Health Care" },
  { value: "industrials", label: "Industrials" },
  { value: "information-technology", label: "Information Technology" },
  { value: "materials", label: "Materials" },
  { value: "real-estate", label: "Real Estate" },
  { value: "utilities", label: "Utilities" },
];

export const defaultDealStages = [
  { value: "opportunity", label: "Opportunity" },
  { value: "proposal-sent", label: "Proposal Sent" },
  { value: "in-negociation", label: "In Negotiation" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "delayed", label: "Delayed" },
];

export const defaultDealPipelineStatuses = ["won"];

export const defaultDealCategories = [
  { value: "other", label: "Other" },
  { value: "copywriting", label: "Copywriting" },
  { value: "print-project", label: "Print project" },
  { value: "ui-design", label: "UI Design" },
  { value: "website-design", label: "Website design" },
];

export const defaultContactStatuses = [
  { value: "ativo", label: "Ativo", color: "#28b446" },
  { value: "inativo", label: "Inativo", color: "#8c939b" },
  { value: "prospect", label: "Prospect", color: "#f5a623" },
  { value: "transferido", label: "Transferido", color: "#e74040" },
];

export const defaultTaskTypes: TaskType[] = [
  { value: "none", label: "None", icon: "CircleOff" },
  { value: "call", label: "Chamada", icon: "Phone" },
  { value: "meeting", label: "Reuniao", icon: "Users" },
  { value: "email", label: "Email", icon: "Mail" },
  { value: "follow-up", label: "Follow-up", icon: "Clock" },
  { value: "lunch", label: "Almoco", icon: "UtensilsCrossed" },
  { value: "demo", label: "Demo", icon: "Monitor" },
  { value: "thank-you", label: "Agradecimento", icon: "Heart" },
  { value: "ship", label: "Envio", icon: "Package" },
  { value: "observation", label: "Observacao", icon: "FileText" },
];

export const defaultConfiguration: ConfigurationContextValue = {
  companySectors: defaultCompanySectors,
  currency: defaultCurrency,
  dealCategories: defaultDealCategories,
  contactStatuses: defaultContactStatuses,
  taskTypes: defaultTaskTypes,
  title: defaultTitle,
  darkModeLogo: defaultDarkModeLogo,
  lightModeLogo: defaultLightModeLogo,
};

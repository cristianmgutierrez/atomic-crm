/**
 * Single source of truth for contact field choices, display helpers, and
 * CSV import/export JSONB utilities.
 *
 * Import from here instead of defining local copies in individual components.
 */

// ─── Select field choices ──────────────────────────────────────────────────────

export const PERSON_TYPE_CHOICES = [
  { id: "PF", name: "Pessoa Física (PF)" },
  { id: "PJ", name: "Pessoa Jurídica (PJ)" },
];

export const XP_INTERNATIONAL_CHOICES = [
  { id: "true", name: "Sim" },
  { id: "false", name: "Não" },
];

export const SEGMENT_CHOICES = [
  { id: "Digital", name: "Digital" },
  { id: "Exclusive", name: "Exclusive" },
  { id: "Signature", name: "Signature" },
  { id: "Unique", name: "Unique" },
  { id: "Private", name: "Private" },
];

export const INVESTOR_PROFILE_CHOICES = [
  { id: "Regular", name: "Regular" },
  { id: "Qualificado", name: "Qualificado" },
  { id: "Profissional", name: "Profissional" },
];

export const XP_ACCOUNT_TYPE_CHOICES = [
  { id: "Assessorado", name: "Assessorado" },
  { id: "Autônomo", name: "Autônomo" },
  { id: "Institucional", name: "Institucional" },
];

export const INVESTMENT_HORIZON_CHOICES = [
  { id: "Curto Prazo", name: "Curto Prazo" },
  { id: "Médio Prazo", name: "Médio Prazo" },
  { id: "Longo Prazo", name: "Longo Prazo" },
];

export const FINANCIAL_GOAL_CHOICES = [
  { id: "Aposentadoria", name: "Aposentadoria" },
  { id: "Preservação de Capital", name: "Preservação de Capital" },
  { id: "Crescimento", name: "Crescimento" },
  { id: "Renda Passiva", name: "Renda Passiva" },
  { id: "Outro", name: "Outro" },
];

export const ORIGIN_CHOICES = [
  { id: "Indicação", name: "Indicação" },
  { id: "Prospecção", name: "Prospecção" },
  { id: "Campanha", name: "Campanha" },
  { id: "Evento", name: "Evento" },
  { id: "Outro", name: "Outro" },
];

export const BRAZIL_STATES: string[] = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

export const BRAZIL_STATE_CHOICES = BRAZIL_STATES.map((s) => ({
  id: s,
  name: s,
}));

export const CROSS_SELL_OPTIONS: string[] = [
  "Banking",
  "Cartão de Crédito",
  "Previdência",
  "Seguro de Vida",
  "Plano de Saúde",
  "Consórcio",
  "Crédito/Financiamento",
  "Offshore",
  "Outro",
];

// ─── Display formatters (read-only, not form inputs) ───────────────────────────

/** Format a numeric DB value as BRL currency for read-only display. */
export const formatCurrencyBRL = (
  value: number | null | undefined,
): string | null =>
  value != null
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value)
    : null;

// ─── JSONB ↔ flat CSV helpers (shared by importer and exporter) ───────────────

type EmailEntry = { email?: string | null; type?: string | null };
type PhoneEntry = { number?: string | null; type?: string | null };

/** Flatten email_jsonb array → { email_work, email_home, email_other } */
export const flattenEmailJsonb = (
  arr: EmailEntry[] | null | undefined,
): { email_work?: string; email_home?: string; email_other?: string } => ({
  email_work: arr?.find((e) => e.type === "Work")?.email ?? undefined,
  email_home: arr?.find((e) => e.type === "Home")?.email ?? undefined,
  email_other: arr?.find((e) => e.type === "Other")?.email ?? undefined,
});

/** Flatten phone_jsonb array → { phone_work, phone_home, phone_other } */
export const flattenPhoneJsonb = (
  arr: PhoneEntry[] | null | undefined,
): { phone_work?: string; phone_home?: string; phone_other?: string } => ({
  phone_work: arr?.find((p) => p.type === "Work")?.number ?? undefined,
  phone_home: arr?.find((p) => p.type === "Home")?.number ?? undefined,
  phone_other: arr?.find((p) => p.type === "Other")?.number ?? undefined,
});

/** Build email_jsonb array from flat { email_work, email_home, email_other } */
export const structureEmailJsonb = ({
  email_work,
  email_home,
  email_other,
}: {
  email_work?: string;
  email_home?: string;
  email_other?: string;
}) =>
  [
    { email: email_work, type: "Work" },
    { email: email_home, type: "Home" },
    { email: email_other, type: "Other" },
  ].filter(({ email }) => !!email);

/** Build phone_jsonb array from flat { phone_work, phone_home, phone_other } */
export const structurePhoneJsonb = ({
  phone_work,
  phone_home,
  phone_other,
}: {
  phone_work?: string;
  phone_home?: string;
  phone_other?: string;
}) =>
  [
    { number: phone_work, type: "Work" },
    { number: phone_home, type: "Home" },
    { number: phone_other, type: "Other" },
  ].filter(({ number }) => !!number);

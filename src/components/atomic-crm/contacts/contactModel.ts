import { Mars, NonBinary, Venus } from "lucide-react";

import type { Company, Contact, ContactGender } from "../types";
import {
  validatePhone,
  validateCPF,
  validateCNPJ,
  validateDate,
  checkDocumentUnique,
} from "./utils/validations";
import { maskCurrency, unmaskCurrency } from "./utils/masks";

/** Convert ISO date (YYYY-MM-DD) to display format (DD/MM/AAAA) */
export const isoToDisplay = (
  v: string | null | undefined,
): string | null | undefined => {
  if (!v) return v;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : v;
};

/** Convert display date (DD/MM/AAAA) to ISO (YYYY-MM-DD) for PostgreSQL */
export const displayToIso = (
  v: string | null | undefined,
): string | null | undefined => {
  if (!v) return v;
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : v;
};

export const defaultEmailJsonb = [{ email: null, type: null }];
export const defaultPhoneJsonb = [{ number: null, type: null }];

export const parseCurrencyField = (
  value: string | number | null | undefined,
): number | null => {
  if (value == null || value === "") return null;
  const parsed = parseFloat(unmaskCurrency(String(value)));
  return isNaN(parsed) ? null : parsed;
};

const cleanContactArrayFields = (data: Contact) => {
  const cleanedEmailJsonb =
    data.email_jsonb?.filter((e) => e.email != null) || [];
  const cleanedPhoneJsonb =
    data.phone_jsonb?.filter((p) => p.number != null) || [];
  return {
    ...data,
    phone_jsonb: cleanedPhoneJsonb.length > 0 ? cleanedPhoneJsonb : null,
    email_jsonb: cleanedEmailJsonb.length > 0 ? cleanedEmailJsonb : null,
    // Convert DD/MM/AAAA → ISO for PostgreSQL date columns
    date_of_birth: displayToIso(data.date_of_birth),
    relationship_start_date: displayToIso(data.relationship_start_date),
    // Convert masked currency strings → numeric for PostgreSQL numeric columns
    monthly_income: parseCurrencyField(data.monthly_income),
    declared_wealth: parseCurrencyField(data.declared_wealth),
  };
};

export const cleanupContactForCreate = (data: Contact) => {
  return cleanContactArrayFields({
    ...data,
    first_seen: new Date().toISOString(),
    last_seen: new Date().toISOString(),
    tags: [],
  });
};

export const cleanupContactForEdit = cleanContactArrayFields;

// ─── Form config ──────────────────────────────────────────────────────────────

/** Validation mode for all contact forms. */
export const CONTACT_FORM_MODE = "onBlur" as const;

/** Number (DB) → masked currency string for form input display (e.g. "R$ 6.000,00"). */
export const toMaskedCurrency = (
  v: number | string | null | undefined,
): string => {
  if (v == null || v === "") return "";
  const num = typeof v === "string" ? parseFloat(v) : v;
  if (isNaN(num)) return "";
  return maskCurrency(Math.round(num * 100).toString());
};

/** Normalize a record loaded from the DB for form display. */
export const normalizeContactArrayFields = (record: Contact) => ({
  ...record,
  email_jsonb:
    record.email_jsonb && record.email_jsonb.length > 0
      ? record.email_jsonb
      : defaultEmailJsonb,
  phone_jsonb:
    record.phone_jsonb && record.phone_jsonb.length > 0
      ? record.phone_jsonb
      : defaultPhoneJsonb,
  // Convert ISO dates → display format
  date_of_birth: isoToDisplay(record.date_of_birth),
  relationship_start_date: isoToDisplay(record.relationship_start_date),
  // Convert numeric DB values → masked currency strings for form inputs
  monthly_income: toMaskedCurrency(record.monthly_income),
  declared_wealth: toMaskedCurrency(record.declared_wealth),
});

/** Default values for new contact forms. */
export const getContactCreateDefaults = (salesId?: string | number) => ({
  sales_id: salesId,
  email_jsonb: defaultEmailJsonb,
  phone_jsonb: defaultPhoneJsonb,
  country: "Brasil",
  person_type: "PF",
  cross_sell_opportunities: [],
  relationship_start_date: isoToDisplay(new Date().toISOString().split("T")[0]),
});

/** Form-level validator: enforces required fields by contact status. */
export const validateContactForm = async (values: Contact) => {
  const errors: Record<string, string> = {};
  const isProspect = values.status === "prospect";

  // Always required
  if (!values.first_name?.trim()) errors.first_name = "ra.validation.required";
  if (!values.last_name?.trim()) errors.last_name = "ra.validation.required";

  const hasPhone = values.phone_jsonb?.some(
    (p) => p.number && validatePhone(p.number),
  );
  const hasEmail = values.email_jsonb?.some(
    (e) => e.email && /\S+@\S+\.\S+/.test(e.email),
  );

  if (isProspect) {
    // Prospect: phone OR email (at least one)
    if (!hasPhone && !hasEmail) {
      errors.phone_jsonb =
        "Para status Prospect: informe ao menos 1 telefone ou 1 e-mail válido.";
    }
  }

  if (values.status && !isProspect) {
    // Non-prospect (ativo, transferido, inativo, etc.)
    if (!values.alias?.trim()) errors.alias = "ra.validation.required";
    if (!hasPhone) errors.phone_jsonb = "Informe ao menos 1 telefone válido.";
    if (!hasEmail) errors.email_jsonb = "Informe ao menos 1 e-mail válido.";

    if (!values.person_type) {
      errors.person_type = "ra.validation.required";
    }

    if (!values.document?.trim()) {
      errors.document = "ra.validation.required";
    } else if (values.person_type === "PJ") {
      if (!validateCNPJ(values.document))
        errors.document = "crm.validation.invalid_cnpj";
    } else {
      if (!validateCPF(values.document))
        errors.document = "crm.validation.invalid_cpf";
    }

    if (values.person_type !== "PJ") {
      if (!values.date_of_birth?.trim()) {
        errors.date_of_birth = "ra.validation.required";
      } else if (!validateDate(values.date_of_birth)) {
        errors.date_of_birth = "Data inválida (use DD/MM/AAAA)";
      }
    }

    if (!values.xp_code?.trim()) errors.xp_code = "ra.validation.required";
    if (!values.segment) errors.segment = "ra.validation.required";
  }

  // Uniqueness check — runs for any contact with a valid-format document
  if (values.document?.trim() && !errors.document) {
    const isUnique = await checkDocumentUnique(values.document, values.id);
    if (!isUnique) {
      errors.document = "crm.validation.document_already_registered";
    }
  }

  return errors;
};

type TranslateFn = (key: string, options?: { [key: string]: any }) => string;

export const contactGenderDefaultLabels: Record<string, string> = {
  male: "Male",
  female: "Female",
  nonbinary: "Other",
};

const personalInfoTypeMap: Record<string, string> = {
  Work: "work",
  Home: "home",
  Other: "other",
};

export const contactGender: ContactGender[] = [
  {
    value: "male",
    label: "resources.contacts.inputs.genders.male",
    icon: Mars,
  },
  {
    value: "female",
    label: "resources.contacts.inputs.genders.female",
    icon: Venus,
  },
  {
    value: "nonbinary",
    label: "resources.contacts.inputs.genders.nonbinary",
    icon: NonBinary,
  },
];

export const translateContactGenderLabel = (
  gender: { value: string; label: string },
  translate: TranslateFn,
) =>
  translate(gender.label, {
    _: contactGenderDefaultLabels[gender.value] ?? gender.label,
  });

export const translatePersonalInfoTypeLabel = (
  type: string,
  translate: TranslateFn,
) =>
  translate(
    `resources.contacts.inputs.personal_info_types.${personalInfoTypeMap[type] ?? type.toLowerCase()}`,
    {
      _: type,
    },
  );

/**
 * Folds a long line according to vCard specification (max 75 chars per line)
 * Continuation lines start with a space
 */
function foldLine(line: string): string {
  const maxLength = 75;
  if (line.length <= maxLength) return line;

  const result: string[] = [];
  let currentLine = line.substring(0, maxLength);
  let remaining = line.substring(maxLength);

  result.push(currentLine);

  while (remaining.length > 0) {
    // Continuation lines start with a space and can have 74 more chars
    const chunkSize = maxLength - 1;
    currentLine = " " + remaining.substring(0, chunkSize);
    remaining = remaining.substring(chunkSize);
    result.push(currentLine);
  }

  return result.join("\r\n");
}

/**
 * Converts a contact and their company to vCard 3.0 format
 */
export function exportToVCard(
  contact: Contact,
  company?: Company,
  photoData?: { base64: string; mimeType: string },
): string {
  const lines: string[] = [];

  // vCard header
  lines.push("BEGIN:VCARD");
  lines.push("VERSION:3.0");

  // Name (N: Family Name;Given Name;Additional Names;Honorific Prefixes;Honorific Suffixes)
  lines.push(`N:${contact.last_name};${contact.first_name};;;`);

  // Formatted name
  lines.push(`FN:${contact.first_name} ${contact.last_name}`);

  // Title/Job position
  if (contact.title) {
    lines.push(`TITLE:${contact.title}`);
  }

  // Organization
  if (company?.name) {
    lines.push(`ORG:${company.name}`);
  }

  // Emails
  if (contact.email_jsonb && contact.email_jsonb.length > 0) {
    contact.email_jsonb.forEach((emailObj) => {
      const type = emailObj.type.toUpperCase();
      lines.push(`EMAIL;TYPE=${type}:${emailObj.email}`);
    });
  }

  // Phone numbers
  if (contact.phone_jsonb && contact.phone_jsonb.length > 0) {
    contact.phone_jsonb.forEach((phoneObj) => {
      const type = phoneObj.type.toUpperCase();
      lines.push(`TEL;TYPE=${type}:${phoneObj.number}`);
    });
  }

  // LinkedIn URL
  if (contact.linkedin_url) {
    lines.push(`URL;TYPE=LINKEDIN:${contact.linkedin_url}`);
  }

  // Website
  if (contact.website) {
    lines.push(`URL;TYPE=WORK:${contact.website}`);
  }

  // Address
  const hasAddress =
    contact.address ||
    contact.city ||
    contact.state ||
    contact.zip_code ||
    contact.country;
  if (hasAddress) {
    // ADR format: PO Box;Extended;Street;City;State;Postal;Country
    const street = [
      contact.address,
      contact.address_number,
      contact.address_complement,
    ]
      .filter(Boolean)
      .join(" ");
    lines.push(
      `ADR;TYPE=HOME:;;${street};${contact.city ?? ""};${contact.state ?? ""};${contact.zip_code ?? ""};${contact.country ?? ""}`,
    );
  }

  // Background/Note
  if (contact.background) {
    // Escape newlines and special characters in notes
    const escapedNote = contact.background
      .replace(/\\/g, "\\\\")
      .replace(/\n/g, "\\n")
      .replace(/,/g, "\\,")
      .replace(/;/g, "\\;");
    lines.push(`NOTE:${escapedNote}`);
  }

  // Photo/Avatar - vCard 3.0 format with base64 encoding
  if (photoData) {
    // Extract image type from MIME type (e.g., "image/png" -> "PNG")
    const imageType = photoData.mimeType.split("/")[1]?.toUpperCase() || "PNG";

    // vCard 3.0 format: PHOTO;ENCODING=b;TYPE=PNG:
    const photoLine = `PHOTO;ENCODING=b;TYPE=${imageType}:${photoData.base64}`;
    lines.push(foldLine(photoLine));
  }

  // vCard footer
  lines.push("END:VCARD");

  return lines.join("\r\n");
}

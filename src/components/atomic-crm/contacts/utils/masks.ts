/**
 * Mask utilities for Brazilian contact form fields.
 * All functions are pure: (rawValue: string) => maskedValue: string
 */

/** Remove all non-digit characters */
export const unmaskDigits = (value: string): string => value.replace(/\D/g, "");

/**
 * Apply phone mask with optional DDI support.
 *
 * International (starts with +): +DDI DDD NNNNN-NNNN
 *   Examples: +55 11 98787-6532 | +1 212 555-1234
 *   DDI heuristic: 1 digit for +1/+7, 2 digits for all others (E.164, max 15 digits).
 *
 * Local (no +): (XX) XXXXX-XXXX or (XX) XXXX-XXXX
 */
export const maskPhone = (value: string): string => {
  const trimmed = (value ?? "").trimStart();

  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/\D/g, "").slice(0, 15);
    if (!digits) return "+";

    // 1-digit DDI for zone 1 (Americas) and zone 7 (Russia/Kazakhstan)
    const ddiLen = digits[0] === "1" || digits[0] === "7" ? 1 : 2;
    const ddi = digits.slice(0, ddiLen);
    const rest = digits.slice(ddiLen);
    if (!rest) return `+${ddi}`;

    const ddd = rest.slice(0, 2);
    const local = rest.slice(2).slice(0, 9);
    if (!local) return `+${ddi} ${ddd}`;

    const formattedLocal =
      local.length <= 8
        ? local.replace(/^(\d{4})(\d)/, "$1-$2")
        : local.replace(/^(\d{5})(\d)/, "$1-$2");

    return `+${ddi} ${ddd} ${formattedLocal}`;
  }

  // Sem '+': auto-prepend +55 (Brasil por padrão)
  const digits = unmaskDigits(trimmed).slice(0, 11);
  if (!digits) return "";

  const ddd = digits.slice(0, 2);
  const local = digits.slice(2).slice(0, 9);
  if (!local) return `+55 ${ddd}`;

  const formattedLocal =
    local.length <= 8
      ? local.replace(/^(\d{4})(\d)/, "$1-$2")
      : local.replace(/^(\d{5})(\d)/, "$1-$2");

  return `+55 ${ddd} ${formattedLocal}`;
};

/** Apply CPF mask: XXX.XXX.XXX-XX */
export const maskCPF = (value: string): string => {
  const digits = unmaskDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
};

/** Apply CNPJ mask: XX.XXX.XXX/XXXX-XX */
export const maskCNPJ = (value: string): string => {
  const digits = unmaskDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5");
};

/** Apply date mask: DD/MM/AAAA */
export const maskDate = (value: string): string => {
  const digits = unmaskDigits(value).slice(0, 8);
  return digits
    .replace(/^(\d{2})(\d)/, "$1/$2")
    .replace(/^(\d{2})\/(\d{2})(\d)/, "$1/$2/$3");
};

/** Apply CEP mask: XXXXX-XXX */
export const maskCEP = (value: string): string => {
  const digits = unmaskDigits(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
};

/** Apply BRL currency mask: R$ X.XXX,XX */
export const maskCurrency = (value: string): string => {
  const digits = unmaskDigits(value).slice(0, 13);
  if (!digits) return "";
  const cents = parseInt(digits, 10);
  const formatted = (cents / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `R$ ${formatted}`;
};

/** Parse currency mask back to a numeric string (cents / 100) */
export const unmaskCurrency = (value: string): string => {
  const digits = unmaskDigits(value);
  if (!digits) return "";
  return (parseInt(digits, 10) / 100).toFixed(2);
};

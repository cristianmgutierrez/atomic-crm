/**
 * Mask utilities for Brazilian contact form fields.
 * All functions are pure: (rawValue: string) => maskedValue: string
 */

/** Remove all non-digit characters */
export const unmaskDigits = (value: string): string => value.replace(/\D/g, "");

/** Apply phone mask: (XX) XXXXX-XXXX or (XX) XXXX-XXXX */
export const maskPhone = (value: string): string => {
  const digits = unmaskDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    // landline: (XX) XXXX-XXXX
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  // mobile: (XX) XXXXX-XXXX
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
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

/**
 * Validation utilities for Brazilian contact form fields.
 * Compatible with ra-core validators: (value, allValues?) => string | undefined
 */

import { unmaskDigits } from "./masks";

/** Validate CPF using modulo-11 algorithm */
export const validateCPF = (cpf: string): boolean => {
  const digits = unmaskDigits(cpf ?? "");
  if (digits.length !== 11) return false;
  // Reject all-same digits
  if (/^(\d)\1{10}$/.test(digits)) return false;

  const calc = (len: number): number => {
    let sum = 0;
    for (let i = 0; i < len; i++) {
      sum += parseInt(digits[i]) * (len + 1 - i);
    }
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calc(9) === parseInt(digits[9]) && calc(10) === parseInt(digits[10]);
};

/** Validate CNPJ using modulo-11 algorithm */
export const validateCNPJ = (cnpj: string): boolean => {
  const digits = unmaskDigits(cnpj ?? "");
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calc = (weights: number[]): number => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += parseInt(digits[i]) * weights[i];
    }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const d1 = calc([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = calc([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

  return d1 === parseInt(digits[12]) && d2 === parseInt(digits[13]);
};

/** Validate phone number — local (10-11 digits) or international (+DDI, 10-15 digits total) */
export const validatePhone = (phone: string): boolean => {
  const trimmed = (phone ?? "").trim();
  if (trimmed.startsWith("+")) {
    const digits = trimmed.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 15;
  }
  const digits = unmaskDigits(trimmed);
  return digits.length >= 10 && digits.length <= 11;
};

/** Validate CEP format */
export const validateCEP = (cep: string): boolean => {
  const digits = unmaskDigits(cep ?? "");
  return digits.length === 8;
};

/** Validate date in DD/MM/AAAA format and ensure <= today */
export const validateDate = (value: string): boolean => {
  if (!value) return true;
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return false;
  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return false;
  }
  return date <= new Date();
};

// --- ra-core compatible validators ---

export const cpfValidator = (value: string | undefined) => {
  if (!value) return undefined;
  return validateCPF(value) ? undefined : "CPF inválido";
};

export const cnpjValidator = (value: string | undefined) => {
  if (!value) return undefined;
  return validateCNPJ(value) ? undefined : "CNPJ inválido";
};

export const phoneValidator = (value: string | undefined) => {
  if (!value) return undefined;
  return validatePhone(value) ? undefined : "Telefone inválido";
};

export const cepValidator = (value: string | undefined) => {
  if (!value) return undefined;
  return validateCEP(value) ? undefined : "CEP inválido";
};

export const dateValidator = (value: string | undefined) => {
  if (!value) return undefined;
  return validateDate(value) ? undefined : "Data inválida";
};

/** Validate basic email format */
export const validateEmail = (email: string): boolean =>
  /\S+@\S+\.\S+/.test(email);

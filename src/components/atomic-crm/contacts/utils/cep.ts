import { unmaskDigits } from "./masks";

export type CepResult = {
  address: string;
  neighborhood: string;
  city: string;
  state: string;
};

/**
 * Fetch address data from ViaCEP API.
 * Throws on invalid CEP, not-found, or network error.
 */
export const searchCEP = async (cep: string): Promise<CepResult> => {
  const digits = unmaskDigits(cep);
  if (digits.length !== 8) throw new Error("CEP inválido");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) throw new Error("Erro ao buscar o CEP.");

    const data = await response.json();
    if (data.erro) throw new Error("CEP não encontrado.");

    return {
      address: data.logradouro ?? "",
      neighborhood: data.bairro ?? "",
      city: data.localidade ?? "",
      state: data.uf ?? "",
    };
  } catch (err: unknown) {
    clearTimeout(timeout);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Erro ao buscar o CEP.");
    }
    throw err;
  }
};

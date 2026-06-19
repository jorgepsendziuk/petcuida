export const normalizeCnpj = (value: string) => value.replace(/\D/g, "").slice(0, 14);

export const formatCnpj = (value: string) => {
  const digits = normalizeCnpj(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  if (digits.length <= 12) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
  }
  return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
};

export const isValidCnpjLength = (value: string) => normalizeCnpj(value).length === 14;

export type BrasilApiCnpj = {
  razao_social?: string;
  nome_fantasia?: string;
  logradouro?: string;
  numero?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  ddd_telefone_1?: string;
  descricao_situacao_cadastral?: string;
};

export const fetchCnpjFromBrasilApi = async (cnpj: string): Promise<BrasilApiCnpj> => {
  const digits = normalizeCnpj(cnpj);
  if (digits.length !== 14) {
    throw new Error("CNPJ deve ter 14 dígitos.");
  }

  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`);
  if (!response.ok) {
    if (response.status === 404) throw new Error("CNPJ não encontrado.");
    throw new Error("Não foi possível consultar o CNPJ. Tente o cadastro manual.");
  }

  return (await response.json()) as BrasilApiCnpj;
};

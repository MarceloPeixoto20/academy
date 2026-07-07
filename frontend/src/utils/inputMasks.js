function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function normalizeKey(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_%]+/g, "_");
}

function formatParts(digits, sizes, separators) {
  let cursor = 0;
  return sizes.reduce((parts, size, index) => {
    const part = digits.slice(cursor, cursor + size);
    cursor += size;
    if (!part) return parts;
    const separator = separators[index] || "";
    return `${parts}${separator}${part}`;
  }, "");
}

export function formatCpf(value) {
  const digits = onlyDigits(value).slice(0, 11);
  return formatParts(digits, [3, 3, 3, 2], ["", ".", ".", "-"]);
}

export function formatCnpj(value) {
  const digits = onlyDigits(value).slice(0, 14);
  return formatParts(digits, [2, 3, 3, 4, 2], ["", ".", ".", "/", "-"]);
}

export function formatCpfCnpj(value) {
  const digits = onlyDigits(value);
  return digits.length > 11 ? formatCnpj(digits) : formatCpf(digits);
}

export function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8);
  return formatParts(digits, [5, 3], ["", "-"]);
}

export function formatPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 2) return `(${digits}`;

  const ddd = digits.slice(0, 2);
  const body = digits.slice(2);
  if (body.length <= 4) return `(${ddd}) ${body}`;

  if (digits.length <= 10) {
    return `(${ddd}) ${body.slice(0, 4)}-${body.slice(4)}`;
  }

  return `(${ddd}) ${body.slice(0, 5)}-${body.slice(5)}`;
}

export function formatUf(value) {
  return String(value ?? "").replace(/[^a-zA-Z]/g, "").toUpperCase().slice(0, 2);
}

export function formatInteger(value, maxLength) {
  const digits = onlyDigits(value);
  return maxLength ? digits.slice(0, maxLength) : digits;
}

export function formatDecimal(value, decimalPlaces = 2) {
  const raw = String(value ?? "").replace(",", ".").replace(/[^\d.]/g, "");
  if (!raw) return "";

  const [integerPart = "", ...decimalParts] = raw.split(".");
  const integer = integerPart.replace(/^0+(?=\d)/, "");
  const decimal = decimalParts.join("").slice(0, decimalPlaces);

  if (raw.includes(".")) {
    return `${integer || "0"}.${decimal}`;
  }

  return integer;
}

function getMaskKind(identifier, type) {
  const key = normalizeKey(identifier);
  if (["date", "time", "email", "password", "checkbox", "select", "textarea"].includes(type)) return null;

  if (key.includes("whatsapp") || key.includes("telefone") || key.includes("celular") || key.includes("fone")) return "phone";
  if (key.includes("contato") && !key.includes("proximo")) return "phone";
  if (key.includes("numero_remetente")) return "phone";
  if (key.includes("cnpj")) return "cnpj";
  if (key.includes("cpf") || key.includes("documento")) return "cpfCnpj";
  if (key.includes("cep")) return "cep";
  if (key === "uf" || key.endsWith("_uf")) return "uf";

  if (
    key.includes("dia_vencimento") ||
    key.includes("dia_geracao") ||
    key.includes("duracao") ||
    key.includes("capacidade") ||
    key.includes("probabilidade") ||
    key.includes("quantidade") ||
    key.includes("series") ||
    key.includes("ordem") ||
    key.includes("descanso") ||
    key === "numero" ||
    key.endsWith("_numero") ||
    key.includes("dias_") ||
    key.endsWith("_dias") ||
    key.includes("ano") ||
    key === "mes"
  ) return "integer";

  if (
    type === "number" ||
    key.includes("valor") ||
    key.includes("percentual") ||
    key.includes("%") ||
    key.includes("juros") ||
    key.includes("desconto") ||
    key.includes("peso") ||
    key.includes("altura") ||
    key.includes("cintura") ||
    key.includes("abdomen") ||
    key.includes("massa") ||
    key.includes("imc") ||
    key.includes("gordura") ||
    key.includes("remuneracao")
  ) return "decimal";

  return null;
}

function integerMaxLength(identifier) {
  const key = normalizeKey(identifier);
  if (key.includes("dia_vencimento") || key.includes("dia_geracao") || key === "mes") return 2;
  if (key.includes("ano")) return 4;
  if (key === "numero" || key.endsWith("_numero")) return 8;
  return null;
}

export function applyInputMask(identifier, value, type = "text") {
  const kind = getMaskKind(identifier, type);
  if (value === null || value === undefined || value === "") return "";

  if (kind === "phone") return formatPhone(value);
  if (kind === "cpfCnpj") return formatCpfCnpj(value);
  if (kind === "cnpj") return formatCnpj(value);
  if (kind === "cep") return formatCep(value);
  if (kind === "uf") return formatUf(value);
  if (kind === "integer") return formatInteger(value, integerMaxLength(identifier));
  if (kind === "decimal") return formatDecimal(value);

  return value;
}

export function getInputMaskAttributes(identifier, type = "text") {
  const kind = getMaskKind(identifier, type);
  if (!kind) return { type };

  const common = { type: "text" };
  if (kind === "phone") return { ...common, inputMode: "tel", maxLength: 15, placeholder: "(99) 99999-9999" };
  if (kind === "cpfCnpj") return { ...common, inputMode: "numeric", maxLength: 18, placeholder: "000.000.000-00" };
  if (kind === "cnpj") return { ...common, inputMode: "numeric", maxLength: 18, placeholder: "00.000.000/0000-00" };
  if (kind === "cep") return { ...common, inputMode: "numeric", maxLength: 9, placeholder: "00000-000" };
  if (kind === "uf") return { ...common, maxLength: 2, placeholder: "UF" };
  if (kind === "integer") return { ...common, inputMode: "numeric" };
  if (kind === "decimal") return { ...common, inputMode: "decimal" };

  return { type };
}

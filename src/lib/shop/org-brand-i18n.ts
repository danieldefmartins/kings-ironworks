// Branding strings (EN / PT-BR / ES): the settings screen and the letterhead.

import { asLang } from "./i18n";

type Row = [key: string, en: string, pt: string, es: string];

const ROWS: Row[] = [
  ["licShort", "Lic. #", "Licença nº", "Lic. n.º"],
  ["brandTitle", "Branding", "Marca", "Marca"],
  ["brandSub", "On every printed sheet, PDF and customer sign-off.", "Em toda folha impressa, PDF e assinatura do cliente.", "En cada hoja impresa, PDF y firma del cliente."],
  ["brandName", "Company name", "Nome da empresa", "Nombre de la empresa"],
  ["brandPhone", "Phone", "Telefone", "Teléfono"],
  ["brandEmail", "Email", "E-mail", "Correo"],
  ["brandAddress", "Address", "Endereço", "Dirección"],
  ["brandWebsite", "Website", "Site", "Sitio web"],
  ["brandLicense", "License #", "Nº da licença", "N.º de licencia"],
  ["brandAccent", "Accent color", "Cor de destaque", "Color de acento"],
  ["brandLogo", "Logo", "Logotipo", "Logotipo"],
  ["brandLogoAdd", "Add logo", "Adicionar logotipo", "Agregar logotipo"],
  ["brandLogoChange", "Change", "Trocar", "Cambiar"],
  ["brandLogoRemove", "Remove", "Remover", "Quitar"],
  ["brandLogoTooBig", "That image is too large. Try a smaller logo.", "Imagem grande demais. Tente um logotipo menor.", "La imagen es demasiado grande. Pruebe un logotipo más pequeño."],
  ["brandPreview", "Letterhead preview", "Prévia do cabeçalho", "Vista previa del membrete"],
  ["brandCustom", "Custom", "Personalizada", "Personalizado"],
];

function build(i: 1 | 2 | 3): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of ROWS) out[r[0]] = r[i];
  return out;
}

const STR = { en: build(1), pt: build(2), es: build(3) };
export const BRAND_KEYS = ROWS.map((r) => r[0]);

export function bt(lang: string | null | undefined, key: string): string {
  const l = asLang(lang);
  return STR[l]?.[key] || STR.en[key] || key;
}

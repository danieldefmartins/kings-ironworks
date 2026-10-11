// Profile completion + W-9 strings (EN / PT-BR / ES).
// The Part II certification stays English on screen and on the PDF (it is the
// legal text); CERT_TRANSLATION below is a reading aid shown under it.

import { asLang } from "./i18n";

type Row = [key: string, en: string, pt: string, es: string];

const ROWS: Row[] = [
  // Banner / wizard shell
  ["bannerTitle", "Complete your profile", "Complete seu perfil", "Completa tu perfil"],
  ["bannerBody", "A few details and your W-9. Takes about 3 minutes.", "Alguns dados e o seu W-9. Leva uns 3 minutos.", "Algunos datos y tu W-9. Toma unos 3 minutos."],
  ["bannerW9Title", "Sign your W-9", "Assine seu W-9", "Firma tu W-9"],
  ["bannerW9Body", "Your tax form is ready for your signature.", "Seu formulário fiscal está pronto para assinatura.", "Tu formulario de impuestos está listo para firmar."],
  ["bannerCta", "Start", "Começar", "Empezar"],
  ["wizardTitle", "Your profile", "Seu perfil", "Tu perfil"],
  ["stepOf", "Step {n} of {total}", "Etapa {n} de {total}", "Paso {n} de {total}"],
  ["continue", "Continue", "Continuar", "Continuar"],
  ["back", "Back", "Voltar", "Atrás"],
  ["skip", "Skip for now", "Pular por agora", "Omitir por ahora"],
  ["saving", "Saving…", "Salvando…", "Guardando…"],
  ["optional", "Optional", "Opcional", "Opcional"],
  ["doneTitle", "You're all set", "Tudo pronto", "Todo listo"],
  ["doneBody", "Your profile is complete and your W-9 is signed. Thank you.", "Seu perfil está completo e seu W-9 está assinado. Obrigado.", "Tu perfil está completo y tu W-9 está firmado. Gracias."],
  ["doneCta", "Back to today", "Voltar para hoje", "Volver a hoy"],
  ["saveError", "Couldn't save. Check your connection and try again.", "Não foi possível salvar. Verifique a conexão e tente de novo.", "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo."],
  ["fixField", "Check this field.", "Confira este campo.", "Revisa este campo."],

  // Steps
  ["step_contact", "About you", "Sobre você", "Sobre ti"],
  ["step_address", "Home address", "Endereço residencial", "Dirección de casa"],
  ["step_emergency", "Emergency contact", "Contato de emergência", "Contacto de emergencia"],
  ["step_payment", "Getting paid", "Pagamento", "Pagos"],
  ["step_w9", "Tax form (W-9)", "Formulário fiscal (W-9)", "Formulario de impuestos (W-9)"],
  ["step_contact_hint", "Your legal name as it appears on your ID and tax documents.", "Seu nome legal, como aparece no documento e na declaração de impostos.", "Tu nombre legal, como aparece en tu identificación y documentos de impuestos."],
  ["step_address_hint", "Where you live. It goes on your W-9 and your 1099.", "Onde você mora. Vai no seu W-9 e no seu 1099.", "Donde vives. Va en tu W-9 y en tu 1099."],
  ["step_emergency_hint", "Who we call if something happens at work.", "Quem chamamos se algo acontecer no trabalho.", "A quién llamamos si pasa algo en el trabajo."],
  ["step_payment_hint", "Where you receive payments. You can add this later.", "Onde você recebe os pagamentos. Pode adicionar depois.", "Donde recibes los pagos. Puedes agregarlo después."],
  ["step_w9_hint", "As an independent contractor (1099), the company needs a signed Form W-9 with your Social Security or tax ID number.", "Como prestador de serviço independente (1099), a empresa precisa de um Formulário W-9 assinado com o seu número do Seguro Social ou de identificação fiscal.", "Como contratista independiente (1099), la empresa necesita un Formulario W-9 firmado con tu número de Seguro Social o de identificación fiscal."],

  // Fields
  ["displayName", "Name shown in the app", "Nome no aplicativo", "Nombre en la app"],
  ["legalName", "Full legal name", "Nome legal completo", "Nombre legal completo"],
  ["phone", "Phone", "Telefone", "Teléfono"],
  ["email", "Email", "E-mail", "Correo"],
  ["street", "Street address", "Endereço (rua e número)", "Dirección (calle y número)"],
  ["unit", "Apt / unit", "Apto / unidade", "Apto / unidad"],
  ["city", "City", "Cidade", "Ciudad"],
  ["state", "State", "Estado", "Estado"],
  ["postalCode", "ZIP code", "CEP (ZIP)", "Código postal (ZIP)"],
  ["emergencyName", "Contact name", "Nome do contato", "Nombre del contacto"],
  ["emergencyPhone", "Contact phone", "Telefone do contato", "Teléfono del contacto"],
  ["emergencyRelationship", "Relationship", "Parentesco", "Parentesco"],
  ["zelleContact", "Zelle phone or email", "Telefone ou e-mail do Zelle", "Teléfono o correo de Zelle"],
  ["zelleName", "Name on the Zelle account", "Nome na conta Zelle", "Nombre en la cuenta Zelle"],

  // W-9 form
  ["w9Title", "Form W-9", "Formulário W-9", "Formulario W-9"],
  ["w9Sub", "Request for Taxpayer Identification Number and Certification", "Solicitação de Número de Identificação do Contribuinte e Certificação", "Solicitud de Número de Identificación del Contribuyente y Certificación"],
  ["w9Private", "Encrypted. Only you and the owner can open it.", "Criptografado. Só você e o dono podem abrir.", "Cifrado. Solo tú y el dueño pueden abrirlo."],
  ["w9Part_name", "Name & tax type", "Nome e tipo fiscal", "Nombre y tipo fiscal"],
  ["w9Part_address", "Address", "Endereço", "Dirección"],
  ["w9Part_tin", "Tax ID number", "Número fiscal", "Número fiscal"],
  ["w9Part_sign", "Review & sign", "Revisar e assinar", "Revisar y firmar"],
  ["line1", "Line 1 · Name", "Linha 1 · Nome", "Línea 1 · Nombre"],
  ["line1Hint", "Your name, exactly as on your Social Security card or tax ID.", "Seu nome, exatamente como no cartão do Seguro Social ou documento fiscal.", "Tu nombre, exactamente como en tu tarjeta de Seguro Social o documento fiscal."],
  ["line2", "Line 2 · Business name", "Linha 2 · Nome da empresa", "Línea 2 · Nombre del negocio"],
  ["line2Hint", "Only if you work under a business or LLC name.", "Só se você trabalha com nome de empresa ou LLC.", "Solo si trabajas con nombre de negocio o LLC."],
  ["line3a", "Line 3a · Federal tax classification", "Linha 3a · Classificação fiscal federal", "Línea 3a · Clasificación fiscal federal"],
  ["cls_individual", "Individual / sole proprietor", "Pessoa física / autônomo", "Persona física / propietario único"],
  ["cls_individual_hint", "Most crew. Also single-member LLCs.", "A maioria da equipe. Também LLC de um só dono.", "La mayoría del equipo. También LLC de un solo dueño."],
  ["cls_c_corp", "C corporation", "Corporação C", "Corporación C"],
  ["cls_s_corp", "S corporation", "Corporação S", "Corporación S"],
  ["cls_partnership", "Partnership", "Sociedade (partnership)", "Sociedad (partnership)"],
  ["cls_trust_estate", "Trust / estate", "Trust / espólio", "Fideicomiso / sucesión"],
  ["cls_llc", "LLC", "LLC", "LLC"],
  ["cls_other", "Other", "Outro", "Otro"],
  ["llcClass", "LLC tax classification", "Classificação fiscal da LLC", "Clasificación fiscal de la LLC"],
  ["llc_C", "C — C corporation", "C — Corporação C", "C — Corporación C"],
  ["llc_S", "S — S corporation", "S — Corporação S", "S — Corporación S"],
  ["llc_P", "P — Partnership", "P — Sociedade", "P — Sociedad"],
  ["otherText", "Describe", "Descreva", "Describe"],
  ["line3b", "Line 3b · I have foreign partners, owners, or beneficiaries", "Linha 3b · Tenho sócios, donos ou beneficiários estrangeiros", "Línea 3b · Tengo socios, dueños o beneficiarios extranjeros"],
  ["exemptions", "Line 4 · Exemptions", "Linha 4 · Isenções", "Línea 4 · Exenciones"],
  ["exemptionsHint", "Most people leave these blank.", "A maioria deixa em branco.", "La mayoría los deja en blanco."],
  ["exemptPayee", "Exempt payee code", "Código de beneficiário isento", "Código de beneficiario exento"],
  ["fatca", "FATCA exemption code", "Código de isenção FATCA", "Código de exención FATCA"],
  ["line5", "Line 5 · Address", "Linha 5 · Endereço", "Línea 5 · Dirección"],
  ["line6", "Line 6 · City, state, ZIP", "Linha 6 · Cidade, estado, ZIP", "Línea 6 · Ciudad, estado, ZIP"],
  ["tinType", "Number type", "Tipo de número", "Tipo de número"],
  ["tin_ssn", "SSN", "SSN", "SSN"],
  ["tin_itin", "ITIN", "ITIN", "ITIN"],
  ["tin_ein", "EIN", "EIN", "EIN"],
  ["tin_ssn_long", "Social Security number", "Número do Seguro Social", "Número de Seguro Social"],
  ["tin_itin_long", "Individual taxpayer ID (starts with 9)", "ITIN — identificação fiscal individual (começa com 9)", "ITIN — identificación fiscal individual (empieza con 9)"],
  ["tin_ein_long", "Employer ID (businesses)", "EIN — identificação de empresa", "EIN — identificación de empresa"],
  ["tinEnter", "Number", "Número", "Número"],
  ["tinConfirm", "Type it again", "Digite de novo", "Escríbelo otra vez"],
  ["tinShow", "Show", "Mostrar", "Mostrar"],
  ["tinHide", "Hide", "Ocultar", "Ocultar"],
  ["tinOnFile", "Use the number on file", "Usar o número cadastrado", "Usar el número registrado"],
  ["tinOnFileOwner", "Entered by the office. Check the last 4 digits.", "Cadastrado pelo escritório. Confira os 4 últimos dígitos.", "Registrado por la oficina. Revisa los últimos 4 dígitos."],
  ["tinOnFileSigned", "From your last signed W-9.", "Do seu último W-9 assinado.", "De tu último W-9 firmado."],
  ["tinDifferent", "Enter a different number", "Digitar outro número", "Escribir otro número"],
  ["tin.length", "Enter all 9 digits.", "Digite os 9 dígitos.", "Escribe los 9 dígitos."],
  ["tin.ssnArea", "That isn't a valid SSN. If it starts with 9, choose ITIN.", "Esse SSN não é válido. Se começa com 9, escolha ITIN.", "Ese SSN no es válido. Si empieza con 9, elige ITIN."],
  ["tin.ssnGroup", "That isn't a valid SSN.", "Esse SSN não é válido.", "Ese SSN no es válido."],
  ["tin.ssnSerial", "That isn't a valid SSN.", "Esse SSN não é válido.", "Ese SSN no es válido."],
  ["tin.itinRange", "That isn't a valid ITIN.", "Esse ITIN não é válido.", "Ese ITIN no es válido."],
  ["tin.einPrefix", "That isn't a valid EIN.", "Esse EIN não é válido.", "Ese EIN no es válido."],
  ["tin.mismatch", "The two numbers don't match.", "Os dois números não são iguais.", "Los dos números no coinciden."],
  ["tin.einRequired", "This tax classification needs an EIN.", "Essa classificação fiscal exige um EIN.", "Esta clasificación fiscal requiere un EIN."],
  ["partII", "Part II · Certification", "Parte II · Certificação", "Parte II · Certificación"],
  ["legalTextNote", "Legal text (English)", "Texto legal (inglês)", "Texto legal (inglés)"],
  ["translation", "Translation, for reference only", "Tradução, apenas para referência", "Traducción, solo como referencia"],
  ["backupWithholding", "I have been notified by the IRS that I am currently subject to backup withholding (cross out item 2).", "Fui notificado pelo IRS de que estou sujeito a retenção de reserva (riscar o item 2).", "El IRS me notificó que estoy sujeto a retención adicional (tachar el punto 2)."],
  ["backupHint", "Rare. Leave unchecked unless the IRS sent you this notice.", "Raro. Deixe desmarcado, a não ser que o IRS tenha enviado esse aviso.", "Poco común. Déjalo sin marcar salvo que el IRS te haya enviado este aviso."],
  ["certify", "Under penalties of perjury, I certify the statements above are true.", "Sob pena de perjúrio, certifico que as declarações acima são verdadeiras.", "Bajo pena de perjurio, certifico que las declaraciones anteriores son verdaderas."],
  ["consentTitle", "Electronic signature", "Assinatura eletrônica", "Firma electrónica"],
  ["consentAgree", "I agree to sign electronically.", "Concordo em assinar eletronicamente.", "Acepto firmar electrónicamente."],
  ["consentHelp", "Your finger signature plus your typed name count as your handwritten signature. You can download your signed copy from your profile at any time.", "Sua assinatura com o dedo e seu nome digitado valem como assinatura à mão. Você pode baixar sua cópia assinada no seu perfil a qualquer momento.", "Tu firma con el dedo y tu nombre escrito valen como tu firma a mano. Puedes descargar tu copia firmada desde tu perfil en cualquier momento."],
  ["signHere", "Sign here", "Assine aqui", "Firma aquí"],
  ["clear", "Clear", "Limpar", "Borrar"],
  ["typedName", "Type your full legal name", "Digite seu nome legal completo", "Escribe tu nombre legal completo"],
  ["date", "Date", "Data", "Fecha"],
  ["pin", "Your PIN, to confirm it's you", "Seu PIN, para confirmar que é você", "Tu PIN, para confirmar que eres tú"],
  ["signCta", "Sign W-9", "Assinar W-9", "Firmar W-9"],
  ["signing", "Signing…", "Assinando…", "Firmando…"],
  ["err.pin", "Wrong PIN.", "PIN incorreto.", "PIN incorrecto."],
  ["err.locked", "Too many tries. Wait 15 minutes.", "Muitas tentativas. Aguarde 15 minutos.", "Demasiados intentos. Espera 15 minutos."],
  ["err.key", "W-9s can't be saved yet. Tell the office (encryption key not set).", "Ainda não é possível salvar W-9. Avise o escritório (chave de criptografia não configurada).", "Todavía no se pueden guardar W-9. Avisa a la oficina (falta la clave de cifrado)."],
  ["err.signature", "Sign with your finger in the box.", "Assine com o dedo no quadro.", "Firma con el dedo en el recuadro."],
  ["err.generic", "Couldn't sign. Try again.", "Não foi possível assinar. Tente de novo.", "No se pudo firmar. Inténtalo de nuevo."],

  // Status (worker + owner)
  ["st_none", "Not requested", "Não solicitado", "No solicitado"],
  ["st_requested", "Requested", "Solicitado", "Solicitado"],
  ["st_prepared", "Awaiting signature", "Aguardando assinatura", "Esperando firma"],
  ["st_signed", "Signed", "Assinado", "Firmado"],
  ["signedOn", "Signed {date}", "Assinado em {date}", "Firmado el {date}"],
  ["viewMyW9", "View my W-9", "Ver meu W-9", "Ver mi W-9"],
  ["updateW9", "Update my W-9", "Atualizar meu W-9", "Actualizar mi W-9"],
  ["profileRow", "Profile details", "Dados do perfil", "Datos del perfil"],
  ["profileRowDone", "Complete", "Completo", "Completo"],
  ["profileRowTodo", "{n} of {total} done", "{n} de {total} feitos", "{n} de {total} listos"],

  // Owner roster
  ["teamTitle", "Team", "Equipe", "Equipo"],
  ["teamSub", "Every active worker, their profile and W-9.", "Todos os trabalhadores ativos, perfil e W-9.", "Todos los trabajadores activos, su perfil y W-9."],
  ["showSystem", "Show system accounts", "Mostrar contas do sistema", "Mostrar cuentas del sistema"],
  ["requestAll", "Request profile + W-9 from all", "Pedir perfil + W-9 a todos", "Pedir perfil + W-9 a todos"],
  ["requestOne", "Request profile + W-9", "Pedir perfil + W-9", "Pedir perfil + W-9"],
  ["requestedOk", "Requested. They'll see it next time they open the app.", "Solicitado. Vão ver na próxima vez que abrirem o app.", "Solicitado. Lo verán la próxima vez que abran la app."],
  ["requestedAllOk", "Requested from {n}.", "Solicitado a {n}.", "Solicitado a {n}."],
  ["download", "Download W-9", "Baixar W-9", "Descargar W-9"],
  ["edit", "Edit", "Editar", "Editar"],
  ["close", "Close", "Fechar", "Cerrar"],
  ["save", "Save", "Salvar", "Guardar"],
  ["saved", "Saved", "Salvo", "Guardado"],
  ["rate", "Rate", "Valor/h", "Tarifa"],
  ["chip_phone", "Phone", "Telefone", "Teléfono"],
  ["chip_email", "Email", "E-mail", "Correo"],
  ["chip_address", "Address", "Endereço", "Dirección"],
  ["chip_emergency", "Emergency", "Emergência", "Emergencia"],
  ["chip_zelle", "Zelle", "Zelle", "Zelle"],
  ["chip_w9", "W-9", "W-9", "W-9"],
  ["owner", "Owner", "Dono", "Dueño"],
  ["system", "System", "Sistema", "Sistema"],
  ["notOnPayroll", "Not on payroll", "Fora da folha", "Fuera de nómina"],
  ["readiness", "1099 readiness", "Prontos para 1099", "Listos para 1099"],
  ["readinessSub", "{ready} of {total} contractors have a signed W-9.", "{ready} de {total} prestadores têm W-9 assinado.", "{ready} de {total} contratistas tienen W-9 firmado."],
  ["readinessMissing", "Missing W-9", "Sem W-9", "Sin W-9"],
  ["readinessReady", "Ready", "Prontos", "Listos"],
  ["enterTin", "Enter TIN", "Cadastrar TIN", "Registrar TIN"],
  ["enterTinHint", "Stored encrypted. The worker still has to review and sign.", "Guardado criptografado. O trabalhador ainda precisa revisar e assinar.", "Se guarda cifrado. El trabajador aún debe revisar y firmar."],
  ["tinSaved", "Saved {masked}. Waiting for their signature.", "Salvo {masked}. Aguardando a assinatura.", "Guardado {masked}. Esperando su firma."],
  ["onFileLabel", "On file", "Cadastrado", "Registrado"],
  ["keyMissing", "W-9 encryption key is not set (W9_ENCRYPTION_KEY). Workers can't sign until it is.", "A chave de criptografia do W-9 não está configurada (W9_ENCRYPTION_KEY). Ninguém consegue assinar até configurar.", "La clave de cifrado del W-9 no está configurada (W9_ENCRYPTION_KEY). Nadie puede firmar hasta configurarla."],
  ["applicationHistory", "Application history", "Histórico de candidaturas", "Historial de solicitudes"],
  ["noWorkers", "No active workers.", "Nenhum trabalhador ativo.", "No hay trabajadores activos."],
  ["profileSection", "Profile", "Perfil", "Perfil"],
];

function build(i: 1 | 2 | 3): Record<string, string> {
  const out: Record<string, string> = {};
  for (const r of ROWS) out[r[0]] = r[i];
  return out;
}
const STR = { en: build(1), pt: build(2), es: build(3) };

export function w9t(lang: string | null | undefined, key: string, vars?: Record<string, string | number>): string {
  const l = asLang(lang);
  let s = STR[l][key] ?? STR.en[key] ?? key;
  if (vars) for (const k in vars) s = s.replace(new RegExp(`\\{${k}\\}`, "g"), String(vars[k]));
  return s;
}

export const W9_KEYS = ROWS.map(r => r[0]);
export const W9_ROWS = ROWS;

// Reading aid for Part II. The English text is the one that is certified.
export const CERT_TRANSLATION: Record<"pt" | "es", { intro: string; items: string[]; consent: string }> = {
  pt: {
    intro: "Sob pena de perjúrio, certifico que:",
    items: [
      "O número mostrado neste formulário é o meu número de identificação de contribuinte correto (ou estou aguardando a emissão de um número); e",
      "Não estou sujeito a retenção de reserva porque (a) sou isento de retenção de reserva, ou (b) não fui notificado pela Receita Federal dos EUA (IRS) de que estou sujeito a retenção de reserva por não ter declarado todos os juros ou dividendos, ou (c) o IRS me notificou de que não estou mais sujeito a retenção de reserva; e",
      "Sou cidadão dos EUA ou outra pessoa dos EUA (conforme definido nas instruções); e",
      "O(s) código(s) FATCA informado(s) neste formulário (se houver), indicando que estou isento de declaração FATCA, está(ão) correto(s).",
    ],
    consent: "Concordo em assinar este Formulário W-9 eletronicamente. Minha assinatura eletrônica (minha assinatura com o dedo junto com meu nome legal digitado) tem o mesmo efeito legal de uma assinatura à mão. Confirmo que sou a pessoa indicada na linha 1, ou estou autorizado a assinar por essa entidade, que entrei com meu próprio PIN, e que posso baixar uma cópia deste formulário assinado a qualquer momento no meu perfil.",
  },
  es: {
    intro: "Bajo pena de perjurio, certifico que:",
    items: [
      "El número que aparece en este formulario es mi número de identificación de contribuyente correcto (o estoy esperando que se me emita un número); y",
      "No estoy sujeto a la retención adicional porque (a) estoy exento de la retención adicional, o (b) el Servicio de Impuestos Internos (IRS) no me ha notificado que estoy sujeto a la retención adicional por no declarar todos los intereses o dividendos, o (c) el IRS me ha notificado que ya no estoy sujeto a la retención adicional; y",
      "Soy ciudadano de los EE. UU. u otra persona de los EE. UU. (según se define en las instrucciones); y",
      "El/los código(s) FATCA anotado(s) en este formulario (si alguno) que indica(n) que estoy exento de declarar conforme a FATCA es/son correcto(s).",
    ],
    consent: "Acepto firmar este Formulario W-9 electrónicamente. Mi firma electrónica (mi firma con el dedo junto con mi nombre legal escrito) tiene el mismo efecto legal que una firma a mano. Confirmo que soy la persona indicada en la línea 1, o que estoy autorizado a firmar por esa entidad, que ingresé con mi propio PIN, y que puedo descargar una copia de este formulario firmado en cualquier momento desde mi perfil.",
  },
};

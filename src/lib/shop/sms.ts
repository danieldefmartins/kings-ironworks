// Minimal SMS stub. The real module is being written in parallel and replaces
// this file at merge; the signature is the contract both sides agree on.
//
// It never sends anything: it logs and returns false, so callers treat it as
// "not delivered" and say so. SMS_DRY_RUN is honoured explicitly so the real
// module and this stub behave the same way in tests and local runs.
export async function sendSms(toE164: string, text: string): Promise<boolean> {
  const dry = process.env.SMS_DRY_RUN;
  console.info(`[sms${dry ? ":dry-run" : ":stub"}] to=${toE164} ${JSON.stringify(text)}`);
  return false;
}

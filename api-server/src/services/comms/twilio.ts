import twilio from 'twilio';

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN } = process.env;

export async function sendSms({ to, body }: { to: string; body: string }) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
    return { sandbox: true };
  }
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
  const from = process.env.TWILIO_FROM || '';
  if (!from) return { sandbox: true, note: 'TWILIO_FROM not set' };
  await client.messages.create({ to, from, body });
  return { ok: true };
}

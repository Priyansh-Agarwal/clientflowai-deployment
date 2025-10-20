import sg from '@sendgrid/mail';

sg.setApiKey(process.env.SENDGRID_API_KEY || '');

export async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  if (!process.env.SENDGRID_API_KEY) return { sandbox: true };
  await sg.send({ to, from: process.env.SENDGRID_FROM || 'noreply@clientflow.ai', subject, html });
  return { ok: true };
}

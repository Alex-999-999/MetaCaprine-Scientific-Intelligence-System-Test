import dotenv from 'dotenv';
import { Resend } from 'resend';

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY?.trim();
const RESEND_FROM_EMAIL = (process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev').trim();
const APP_URL = (
  process.env.APP_URL?.trim() ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
).replace(/\/+$/, '');

let resend = null;
if (RESEND_API_KEY) {
  resend = new Resend(RESEND_API_KEY);
} else {
  console.warn('RESEND_API_KEY not set. Email verification will not work.');
}

function ensureResendConfigured() {
  if (!resend) {
    console.error('Resend client not configured');
    return false;
  }
  return true;
}

async function sendEmail(payload) {
  if (!ensureResendConfigured()) {
    return { ok: false, error: 'Resend client not configured' };
  }

  try {
    const { data, error } = await resend.emails.send(payload);

    // Resend SDK can return { error } without throwing.
    if (error) {
      console.error('Resend API returned an error:', error);
      return { ok: false, error };
    }

    return { ok: true, data };
  } catch (error) {
    console.error('Unexpected Resend send error:', error);
    return { ok: false, error };
  }
}

export async function sendVerificationEmail(email, name, verificationToken) {
  const verificationUrl = `${APP_URL}/verify-email?token=${verificationToken}`;
  const displayName = name || 'Usuario';

  const textBody = [
    `Hola ${displayName},`,
    '',
    'Gracias por registrarte en MetaCaprine Intelligence.',
    '',
    'Verifica tu correo haciendo clic en este enlace:',
    verificationUrl,
    '',
    'Este enlace expira en 24 horas.',
    '',
    'Si no creaste esta cuenta, ignora este mensaje.',
    '',
    'Equipo MetaCaprine',
  ].join('\n');

  const htmlBody = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verifica tu correo - MetaCaprine</title>
  </head>
  <body style="font-family: Arial, sans-serif; color: #111; line-height: 1.5; max-width: 640px; margin: 0 auto; padding: 20px;">
    <h1 style="margin: 0 0 16px 0; color: #15803d;">MetaCaprine Intelligence</h1>
    <p>Hola <strong>${displayName}</strong>,</p>
    <p>Gracias por registrarte. Verifica tu correo con el siguiente enlace:</p>
    <p>
      <a href="${verificationUrl}" style="display: inline-block; background: #16a34a; color: #fff; text-decoration: none; padding: 12px 18px; border-radius: 6px;">
        Verificar correo
      </a>
    </p>
    <p style="font-size: 14px; color: #444;">Si el boton no funciona, copia y pega: ${verificationUrl}</p>
    <p style="font-size: 14px; color: #444;">Este enlace expira en 24 horas.</p>
  </body>
</html>
  `;

  const result = await sendEmail({
    from: `MetaCaprine Intelligence <${RESEND_FROM_EMAIL}>`,
    to: email,
    subject: 'Verifica tu correo electronico - MetaCaprine',
    text: textBody,
    html: htmlBody,
  });

  if (!result.ok) {
    return false;
  }

  console.log(`Verification email sent to ${email} (id: ${result.data?.id || 'n/a'})`);
  return true;
}

export async function sendPasswordResetEmail(email, name, resetToken) {
  const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
  const displayName = name || 'Usuario';

  const textBody = [
    `Hola ${displayName},`,
    '',
    'Recibimos una solicitud para restablecer tu contrasena.',
    '',
    'Crea una nueva contrasena aqui:',
    resetUrl,
    '',
    'Este enlace expira en 1 hora.',
    '',
    'Si no solicitaste este cambio, ignora este mensaje.',
    '',
    'Equipo MetaCaprine',
  ].join('\n');

  const htmlBody = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Restablecer contrasena - MetaCaprine</title>
  </head>
  <body style="font-family: Arial, sans-serif; color: #111; line-height: 1.5; max-width: 640px; margin: 0 auto; padding: 20px;">
    <h1 style="margin: 0 0 16px 0; color: #b91c1c;">Restablecer contrasena</h1>
    <p>Hola <strong>${displayName}</strong>,</p>
    <p>Crea una nueva contrasena con el siguiente enlace:</p>
    <p>
      <a href="${resetUrl}" style="display: inline-block; background: #dc2626; color: #fff; text-decoration: none; padding: 12px 18px; border-radius: 6px;">
        Restablecer contrasena
      </a>
    </p>
    <p style="font-size: 14px; color: #444;">Si el boton no funciona, copia y pega: ${resetUrl}</p>
    <p style="font-size: 14px; color: #444;">Este enlace expira en 1 hora.</p>
  </body>
</html>
  `;

  const result = await sendEmail({
    from: `MetaCaprine Intelligence <${RESEND_FROM_EMAIL}>`,
    to: email,
    subject: 'Restablecer contrasena - MetaCaprine',
    text: textBody,
    html: htmlBody,
  });

  if (!result.ok) {
    return false;
  }

  console.log(`Password reset email sent to ${email} (id: ${result.data?.id || 'n/a'})`);
  return true;
}

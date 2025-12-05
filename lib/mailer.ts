import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT ?? 587);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;

let transporter: nodemailer.Transporter | null = null;

if (smtpHost && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
} else {
  console.warn('SMTP credentials are missing. Email delivery is disabled.');
}

interface PasswordResetEmailInput {
  to: string;
  code: string;
  expiresAt: string;
  requestId: string;
  displayName?: string | null;
}

export async function sendPasswordResetEmail({
  to,
  code,
  expiresAt,
  requestId,
  displayName,
}: PasswordResetEmailInput) {
  if (!transporter) {
    return { success: false, message: 'Email transport not configured' };
  }

  const friendlyName = (displayName ?? '').trim() || 'Amigo Xoco';
  const expirationDate = new Date(expiresAt);
  const formattedExpiration = expirationDate.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const subject = 'Recupera tu acceso a Xoco Café';

  const htmlBody = `
    <p>Hola ${friendlyName},</p>
    <p>
      Recibimos una solicitud para restablecer tu contraseña. Ingresa el siguiente código en la app
      dentro de los próximos 5 minutos.
    </p>
    <p style="font-size:32px;font-weight:700;letter-spacing:0.3rem;text-align:center;">${code}</p>
    <p>El código expira a las <strong>${formattedExpiration}</strong>. Si no pediste este cambio, ignora este correo.</p>
    <p style="margin-top:24px;color:#6B7280;font-size:13px;">ID de solicitud: ${requestId}</p>
  `;

  const textBody = `Hola ${friendlyName}, tu código de recuperación es ${code}. Expira a las ${formattedExpiration}. ID de solicitud: ${requestId}.`;

  const templateId = Number(
    process.env.BREVO_RESET_TEMPLATE_ID ?? process.env.BREVO_TEMPLATE_ID ?? 2
  );
  const headers: Record<string, string> = {};
  if (Number.isFinite(templateId) && templateId > 0) {
    headers['X-SIB-Template-ID'] = String(templateId);
    headers['X-SIB-Template-Parameters'] = JSON.stringify({
      FIRSTNAME: friendlyName,
      RESET_CODE: code,
      EXPIRES_AT: formattedExpiration,
      REQUEST_ID: requestId,
    });
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || `Xoco Café <${smtpUser}>`,
    to,
    subject,
    text: textBody,
    html: htmlBody,
    headers,
  });

  return { success: true };
}

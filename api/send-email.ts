import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Resend } from 'resend';

const MAX_PDF_SIZE = 25 * 1024 * 1024;
const RECIPIENT = 'conserjeria.ies.albalat@educarex.es';

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

function decodeHeader(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value || '';
  try {
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function readBody(req: VercelRequest): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body, 'binary');

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido.' });
  }

  try {
    const educarexEmail = decodeHeader(req.headers['x-educarex-email']).toLowerCase();
    const teacherCode = decodeHeader(req.headers['x-teacher-code']).toUpperCase();
    const copiesCount = Math.floor(Number(decodeHeader(req.headers['x-copies-count'])));
    const purpose = decodeHeader(req.headers['x-purpose']) === 'alumnado' ? 'alumnado' : 'personal';
    const course = decodeHeader(req.headers['x-course']);
    const group = decodeHeader(req.headers['x-group']);
    const fileName = decodeHeader(req.headers['x-pdf-filename']) || 'documento.pdf';

    if (!educarexEmail.endsWith('@educarex.es')) {
      return res.status(403).json({
        success: false,
        error: 'Acceso denegado: el correo debe terminar en @educarex.es.',
      });
    }

    if (!teacherCode) {
      return res.status(400).json({ success: false, error: 'El código de profesor/a es obligatorio.' });
    }

    if (!Number.isInteger(copiesCount) || copiesCount < 1 || copiesCount > 1000) {
      return res.status(400).json({ success: false, error: 'El número de copias debe estar entre 1 y 1000.' });
    }

    if (purpose === 'alumnado' && (!course || !group)) {
      return res.status(400).json({
        success: false,
        error: 'Para copias de alumnado es obligatorio indicar el Curso y el Grupo.',
      });
    }

    if (!fileName.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({ success: false, error: 'El archivo adjunto debe ser un PDF.' });
    }

    const pdf = await readBody(req);

    if (!pdf.length) {
      return res.status(400).json({ success: false, error: 'Debes adjuntar un archivo PDF.' });
    }

    if (pdf.length > MAX_PDF_SIZE) {
      return res.status(413).json({ success: false, error: 'El PDF supera el límite de 25 MB.' });
    }

    if (pdf.subarray(0, 5).toString('ascii') !== '%PDF-') {
      return res.status(400).json({ success: false, error: 'El archivo seleccionado no parece ser un PDF válido.' });
    }

    const purposeLabel = purpose === 'alumnado'
      ? `Copias para alumnado`
      : 'Uso personal';

    const subject = `[COPIAS IES ALBALAT] Prof. ${teacherCode} - ${copiesCount} copias`;

    const rows = [
      ['Correo Educarex', educarexEmail],
      ['Código de profesor/a', teacherCode],
      ['Número de copias', String(copiesCount)],
      ['Fin de las copias', purposeLabel],
      ...(purpose === 'alumnado'
        ? [['Curso', course], ['Grupo', group]]
        : []),
      ['Archivo PDF', fileName],
    ];

    const htmlRows = rows.map(([label, value]) => `
      <tr>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;font-weight:600;color:#374151;background:#f9fafb;white-space:nowrap;">
          ${escapeHtml(label)}
        </td>
        <td style="padding:10px 12px;border:1px solid #e5e7eb;color:#111827;">
          ${escapeHtml(value)}
        </td>
      </tr>
    `).join('');

    const html = `
      <!doctype html>
      <html lang="es">
        <body style="margin:0;padding:24px;background:#f3f4f6;font-family:Arial,Helvetica,sans-serif;color:#111827;">
          <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:22px;">
            <h2 style="margin:0 0 18px;font-size:18px;color:#111827;">Solicitud de fotocopias · IES Albalat</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tbody>${htmlRows}</tbody>
            </table>
          </div>
        </body>
      </html>
    `;

    const apiKey = clean(process.env.RESEND_API_KEY);
    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error: 'Falta RESEND_API_KEY en las variables de entorno de Vercel.',
      });
    }

    const from = clean(process.env.RESEND_FROM_EMAIL) || 'onboarding@resend.dev';
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from,
      to: [RECIPIENT],
      replyTo: educarexEmail,
      subject,
      html,
      attachments: [
        {
          filename: fileName,
          content: pdf.toString('base64'),
        },
      ],
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(502).json({
        success: false,
        error: 'Resend no pudo enviar el correo. Comprueba el dominio remitente en Resend.',
      });
    }

    const timestamp = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });

    return res.status(200).json({
      success: true,
      method: 'resend',
      message: 'Correo enviado correctamente a conserjería.',
      recipient: RECIPIENT,
      timestamp,
      messageId: data?.id,
      details: {
        teacherCode,
        copiesCount,
        purpose: purposeLabel,
        course: purpose === 'alumnado' ? course : undefined,
        group: purpose === 'alumnado' ? group : undefined,
        pdfName: fileName,
      },
    });
  } catch (error: any) {
    console.error('Error in /api/send-email:', error?.message || error);
    return res.status(500).json({
      success: false,
      error: 'Error interno al preparar o enviar la solicitud.',
    });
  }
}

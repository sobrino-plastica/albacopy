import type {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';
import { Resend } from 'resend';

const MAX_PDF_SIZE = 25 * 1024 * 1024;

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function parseRequestBody(
  body: unknown
): Record<string, unknown> {
  if (
    body &&
    typeof body === 'object' &&
    !Buffer.isBuffer(body)
  ) {
    return body as Record<string, unknown>;
  }

  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);

      if (
        parsed &&
        typeof parsed === 'object'
      ) {
        return parsed as Record<
          string,
          unknown
        >;
      }
    } catch {
      // El cuerpo no era JSON válido.
    }
  }

  return {};
}

function isValidBlobUrl(
  value: string
): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === 'https:' &&
      url.hostname.endsWith(
        '.blob.vercel-storage.com'
      )
    );
  } catch {
    return false;
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Método no permitido.',
    });
  }

  try {
    // --------------------------------------------------
    // LEER DATOS JSON
    // --------------------------------------------------

    const body = parseRequestBody(
      req.body
    );

    const educarexEmail = clean(
      body.educarexEmail
    ).toLowerCase();

    const teacherCode = clean(
      body.teacherCode
    ).toUpperCase();

    const copiesCount = Math.floor(
      Number(body.copiesCount)
    );

    const purpose =
      body.purpose === 'alumnado'
        ? 'alumnado'
        : 'personal';

    const course = clean(
      body.course
    );

    const group = clean(
      body.group
    );

    const fileName =
      clean(body.fileName) ||
      'documento.pdf';

    const blobUrl = clean(
      body.blobUrl
    );

    const fileSize = Number(
      body.fileSize
    );

    console.log(
      'Solicitud recibida:',
      {
        educarexEmail,
        teacherCode,
        copiesCount,
        purpose,
        course,
        group,
        fileName,
        blobUrl,
        fileSize,
      }
    );

    // --------------------------------------------------
    // VALIDACIONES
    // --------------------------------------------------

    if (
      !/^[^\s@]+@educarex\.es$/i.test(
        educarexEmail
      )
    ) {
      return res.status(403).json({
        success: false,
        error:
          'Acceso denegado: el correo debe terminar en @educarex.es.',
      });
    }

    if (!teacherCode) {
      return res.status(400).json({
        success: false,
        error:
          'El código de profesor/a es obligatorio.',
      });
    }

    if (
      !Number.isInteger(copiesCount) ||
      copiesCount < 1 ||
      copiesCount > 1000
    ) {
      return res.status(400).json({
        success: false,
        error:
          'El número de copias debe estar entre 1 y 1000.',
      });
    }

    if (
      purpose === 'alumnado' &&
      (!course || !group)
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Para copias de alumnado es obligatorio indicar el Curso y el Grupo.',
      });
    }

    if (
      !fileName
        .toLowerCase()
        .endsWith('.pdf')
    ) {
      return res.status(400).json({
        success: false,
        error:
          'El archivo adjunto debe ser un PDF.',
      });
    }

    if (
      !Number.isFinite(fileSize) ||
      fileSize <= 0
    ) {
      return res.status(400).json({
        success: false,
        error:
          'No se ha podido determinar el tamaño del PDF.',
      });
    }

    if (fileSize > MAX_PDF_SIZE) {
      return res.status(413).json({
        success: false,
        error:
          'El PDF no puede superar los 25 MB.',
      });
    }

    if (
      !blobUrl ||
      !isValidBlobUrl(blobUrl)
    ) {
      return res.status(400).json({
        success: false,
        error:
          'La ubicación del PDF en Vercel Blob no es válida.',
      });
    }

    // --------------------------------------------------
    // DATOS DEL CORREO
    // --------------------------------------------------

    const purposeLabel =
      purpose === 'alumnado'
        ? 'Copias para alumnado'
        : 'Uso personal';

    const subject =
      `[COPIAS IES ALBALAT] Prof. ${teacherCode} - ${copiesCount} copias`;

    const rows = [
      [
        'Correo Educarex',
        educarexEmail,
      ],
      [
        'Código de profesor/a',
        teacherCode,
      ],
      [
        'Número de copias',
        String(copiesCount),
      ],
      [
        'Fin de las copias',
        purposeLabel,
      ],
      ...(purpose === 'alumnado'
        ? [
            [
              'Curso',
              course,
            ],
            [
              'Grupo',
              group,
            ],
          ]
        : []),
      [
        'Archivo PDF',
        fileName,
      ],
    ];

    const htmlRows = rows
      .map(
        ([label, value]) => `
          <tr>
            <td style="
              padding:10px 12px;
              border:1px solid #e5e7eb;
              font-weight:600;
              color:#374151;
              background:#f9fafb;
              white-space:nowrap;
            ">
              ${escapeHtml(label)}
            </td>

            <td style="
              padding:10px 12px;
              border:1px solid #e5e7eb;
              color:#111827;
            ">
              ${escapeHtml(value)}
            </td>
          </tr>
        `
      )
      .join('');

    const html = `
      <!doctype html>
      <html lang="es">
        <body style="
          margin:0;
          padding:24px;
          background:#f3f4f6;
          font-family:Arial,Helvetica,sans-serif;
          color:#111827;
        ">

          <div style="
            max-width:620px;
            margin:0 auto;
            background:#ffffff;
            border:1px solid #e5e7eb;
            border-radius:10px;
            padding:22px;
          ">

            <h2 style="
              margin:0 0 18px;
              font-size:18px;
              color:#111827;
            ">
              Solicitud de fotocopias · IES Albalat
            </h2>

            <table style="
              width:100%;
              border-collapse:collapse;
              font-size:14px;
            ">

              <tbody>
                ${htmlRows}
              </tbody>

            </table>

          </div>

        </body>
      </html>
    `;

    // --------------------------------------------------
    // VARIABLES DE ENTORNO
    // --------------------------------------------------

    const apiKey = clean(
      process.env.RESEND_API_KEY
    );

    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error:
          'Falta RESEND_API_KEY en las variables de entorno de Vercel.',
      });
    }

    const recipient = clean(
      process.env.RESEND_TO_EMAIL
    );

    if (!recipient) {
      return res.status(503).json({
        success: false,
        error:
          'Falta RESEND_TO_EMAIL en las variables de entorno de Vercel.',
      });
    }

    const from =
      clean(
        process.env.RESEND_FROM_EMAIL
      ) ||
      'onboarding@resend.dev';

    // --------------------------------------------------
    // RESEND
    // --------------------------------------------------

    const resend =
      new Resend(apiKey);

    const {
      data,
      error,
    } =
      await resend.emails.send({
        from,
        to: [recipient],
        replyTo: educarexEmail,
        subject,
        html,

        attachments: [
          {
            filename: fileName,
            path: blobUrl,
          },
        ],
      });

    if (error) {
      console.error(
        'Resend error:',
        error
      );

      return res.status(502).json({
        success: false,
        error:
          'Resend no pudo enviar el correo. Comprueba la configuración del remitente.',
      });
    }

    // --------------------------------------------------
    // RESPUESTA
    // --------------------------------------------------

    const timestamp =
      new Date().toLocaleString(
        'es-ES',
        {
          timeZone:
            'Europe/Madrid',
        }
      );

    return res.status(200).json({
      success: true,
      method: 'resend',
      message:
        'Correo enviado correctamente.',
      recipient,
      timestamp,
      messageId: data?.id,

      details: {
        teacherCode,
        copiesCount,
        purpose: purposeLabel,

        course:
          purpose === 'alumnado'
            ? course
            : undefined,

        group:
          purpose === 'alumnado'
            ? group
            : undefined,

        pdfName: fileName,
      },
    });
  } catch (error: any) {
    console.error(
      'Error en /api/send-email:',
      error?.message ||
        error
    );

    return res.status(500).json({
      success: false,
      error:
        'Error interno al preparar o enviar la solicitud.',
    });
  }
}

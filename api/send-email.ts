import {
  get,
} from '@vercel/blob';

import type {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

import { Resend } from 'resend';

const MAX_PDF_SIZE =
  25 * 1024 * 1024;

const FIXED_RECIPIENT =
  'conserjeria.ies.albalat@educarex.es';

function clean(
  value: unknown
): string {
  return String(
    value ?? ''
  ).trim();
}

function escapeHtml(
  value: string
): string {
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
      const parsed =
        JSON.parse(body);

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
      // JSON inválido.
    }
  }

  return {};
}

function isValidBlobPathname(
  value: string
): boolean {
  return (
    value.startsWith('albacopy/') &&
    value
      .toLowerCase()
      .endsWith('.pdf')
  );
}

async function streamToBuffer(
  stream: ReadableStream<Uint8Array>
): Promise<Buffer> {
  const reader =
    stream.getReader();

  const chunks: Buffer[] = [];

  try {
    while (true) {
      const {
        done,
        value,
      } = await reader.read();

      if (done) {
        break;
      }

      if (value) {
        chunks.push(
          Buffer.from(value)
        );
      }
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks);
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error:
        'Método no permitido.',
    });
  }

  try {
    const body =
      parseRequestBody(req.body);

    const educarexEmail =
      clean(
        body.educarexEmail
      ).toLowerCase();

    const teacherCode =
      clean(
        body.teacherCode
      ).toUpperCase();

    const copiesCount =
      Math.floor(
        Number(
          body.copiesCount
        )
      );

    const purpose =
      body.purpose ===
      'alumnado'
        ? 'alumnado'
        : 'personal';

    const course =
      clean(body.course);

    const group =
      clean(body.group);

    const fileName =
      clean(
        body.fileName
      ) ||
      'documento.pdf';

    /*
     * NUEVO:
     * Recibimos únicamente el pathname
     * del Blob privado.
     */
    const pathname =
      clean(body.pathname);

    const fileSize =
      Number(
        body.fileSize
      );

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
      !Number.isInteger(
        copiesCount
      ) ||
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
      !Number.isFinite(
        fileSize
      ) ||
      fileSize <= 0
    ) {
      return res.status(400).json({
        success: false,
        error:
          'No se ha podido determinar el tamaño del PDF.',
      });
    }

    if (
      fileSize >
      MAX_PDF_SIZE
    ) {
      return res.status(413).json({
        success: false,
        error:
          'El PDF no puede superar los 25 MB.',
      });
    }

    if (
      !pathname ||
      !isValidBlobPathname(
        pathname
      )
    ) {
      return res.status(400).json({
        success: false,
        error:
          'La ubicación del PDF en Vercel Blob no es válida.',
      });
    }

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
        pathname,
        fileSize,
      }
    );

    /*
     * =========================================================
     * RECUPERAR EL PDF PRIVADO DESDE VERCEL BLOB
     * =========================================================
     *
     * Vercel autentica esta operación mediante OIDC.
     *
     * No hacemos fetch() a una URL privada.
     * No generamos una URL GET firmada.
     * No hacemos pública la carpeta.
     */

    const blobResult =
      await get(
        pathname,
        {
          access: 'private',
        }
      );

    if (!blobResult) {
      throw new Error(
        'Vercel Blob no encuentra el PDF solicitado.'
      );
    }

    if (
      blobResult.statusCode !== 200 ||
      !blobResult.stream
    ) {
      throw new Error(
        'Vercel Blob no pudo entregar el contenido del PDF.'
      );
    }

    console.log(
      'PDF recuperado correctamente desde Vercel Blob:',
      {
        pathname:
          blobResult.blob.pathname,
        size:
          blobResult.blob.size,
        contentType:
          blobResult.blob.contentType,
      }
    );

    const downloadedPdf =
      await streamToBuffer(
        blobResult.stream
      );

    if (
      downloadedPdf.length === 0
    ) {
      throw new Error(
        'El PDF recuperado desde Vercel Blob está vacío.'
      );
    }

    if (
      downloadedPdf.length >
      MAX_PDF_SIZE
    ) {
      throw new Error(
        'El PDF recuperado supera el límite permitido de 25 MB.'
      );
    }

    /*
     * =========================================================
     * RESEND
     * =========================================================
     */

    const resendApiKey =
      process.env.RESEND_API_KEY;

    if (!resendApiKey) {
      throw new Error(
        'Falta RESEND_API_KEY en las variables de entorno de Vercel.'
      );
    }

    const resend =
      new Resend(
        resendApiKey
      );

    /*
     * Durante las pruebas:
     *
     * RESEND_TO_EMAIL = tu correo de Educarex
     *
     * Cuando todo funcione:
     *
     * RESEND_TO_EMAIL =
     * conserjeria.ies.albalat@educarex.es
     */

    const recipient =
      clean(
        process.env.RESEND_TO_EMAIL
      ) ||
      FIXED_RECIPIENT;

    const fromEmail =
      clean(
        process.env.RESEND_FROM_EMAIL
      ) ||
      'onboarding@resend.dev';

    const subject =
      `[COPIAS IES ALBALAT] Prof. ${teacherCode} - ${copiesCount} copias`;

    const purposeText =
      purpose === 'alumnado'
        ? 'Alumnado'
        : 'Personal';

    const courseGroup =
      purpose === 'alumnado'
        ? `${course} - ${group}`
        : '—';

    const safeEducarexEmail =
      escapeHtml(
        educarexEmail
      );

    const safeTeacherCode =
      escapeHtml(
        teacherCode
      );

    const safePurpose =
      escapeHtml(
        purposeText
      );

    const safeCourseGroup =
      escapeHtml(
        courseGroup
      );

    const safeFileName =
      escapeHtml(
        fileName
      );

    const html = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Solicitud de copias</title>
        </head>

        <body
          style="
            margin:0;
            padding:0;
            background:#f5f5f5;
            font-family:Arial,Helvetica,sans-serif;
            color:#222;
          "
        >
          <div
            style="
              max-width:650px;
              margin:30px auto;
              background:#ffffff;
              border-radius:12px;
              padding:30px;
              box-sizing:border-box;
            "
          >

            <h1
              style="
                margin-top:0;
                font-size:24px;
              "
            >
              Solicitud de copias
            </h1>

            <p>
              Se ha recibido una nueva solicitud
              de copias desde AlbaCopy.
            </p>

            <table
              cellpadding="8"
              cellspacing="0"
              style="
                width:100%;
                border-collapse:collapse;
                margin-top:20px;
              "
            >
              <tr>
                <td
                  style="
                    font-weight:bold;
                    border-bottom:1px solid #ddd;
                  "
                >
                  Profesor/a
                </td>
                <td
                  style="
                    border-bottom:1px solid #ddd;
                  "
                >
                  ${safeTeacherCode}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    font-weight:bold;
                    border-bottom:1px solid #ddd;
                  "
                >
                  Correo
                </td>
                <td
                  style="
                    border-bottom:1px solid #ddd;
                  "
                >
                  ${safeEducarexEmail}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    font-weight:bold;
                    border-bottom:1px solid #ddd;
                  "
                >
                  Número de copias
                </td>
                <td
                  style="
                    border-bottom:1px solid #ddd;
                  "
                >
                  ${copiesCount}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    font-weight:bold;
                    border-bottom:1px solid #ddd;
                  "
                >
                  Finalidad
                </td>
                <td
                  style="
                    border-bottom:1px solid #ddd;
                  "
                >
                  ${safePurpose}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    font-weight:bold;
                    border-bottom:1px solid #ddd;
                  "
                >
                  Curso / Grupo
                </td>
                <td
                  style="
                    border-bottom:1px solid #ddd;
                  "
                >
                  ${safeCourseGroup}
                </td>
              </tr>

              <tr>
                <td
                  style="
                    font-weight:bold;
                  "
                >
                  Archivo
                </td>
                <td>
                  ${safeFileName}
                </td>
              </tr>
            </table>

            <p
              style="
                margin-top:30px;
                font-size:13px;
                color:#666;
              "
            >
              Solicitud generada automáticamente
              por AlbaCopy.
            </p>

          </div>
        </body>
      </html>
    `;

    const emailResult =
      await resend.emails.send({
        from: fromEmail,
        to: [recipient],
        replyTo: educarexEmail,
        subject,
        html,
        attachments: [
          {
            filename: fileName,
            content: downloadedPdf,
          },
        ],
      });

    console.log(
      'Resend ha aceptado el correo:',
      emailResult
    );

    if (emailResult.error) {
      throw new Error(
        emailResult.error.message ||
        'Resend ha rechazado el envío.'
      );
    }

    return res.status(200).json({
      success: true,
      message:
        'Solicitud enviada correctamente.',
      id:
        emailResult.data?.id ||
        null,
    });
  } catch (error) {
    console.error(
      'Error en /api/send-email:',
      error
    );

    return res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'No se pudo enviar la solicitud.',
    });
  }
}

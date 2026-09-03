import {
  issueSignedToken,
  presignUrl,
} from '@vercel/blob';

import type {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

import { Resend } from 'resend';

const MAX_PDF_SIZE =
  25 * 1024 * 1024;

const SIGNED_DOWNLOAD_URL_MS =
  15 * 60 * 1000;

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
    .replaceAll(
      '&',
      '&amp;'
    )
    .replaceAll(
      '<',
      '&lt;'
    )
    .replaceAll(
      '>',
      '&gt;'
    )
    .replaceAll(
      '"',
      '&quot;'
    )
    .replaceAll(
      "'",
      '&#039;'
    );
}

function parseRequestBody(
  body: unknown
): Record<string, unknown> {
  if (
    body &&
    typeof body === 'object' &&
    !Buffer.isBuffer(body)
  ) {
    return body as Record<
      string,
      unknown
    >;
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

function isValidPrivateBlobUrl(
  value: string
): boolean {
  try {
    const url = new URL(value);

    return (
      url.protocol === 'https:' &&
      url.hostname.endsWith(
        '.private.blob.vercel-storage.com'
      )
    );
  } catch {
    return false;
  }
}

function isValidBlobPathname(
  value: string
): boolean {
  return (
    value.startsWith(
      'albacopy/'
    ) &&
    value
      .toLowerCase()
      .endsWith('.pdf')
  );
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

    const blobUrl =
      clean(body.blobUrl);

    const fileSize =
      Number(
        body.fileSize
      );

    /*
     * Validación del correo institucional.
     */

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

    /*
     * Código de profesor.
     */

    if (!teacherCode) {
      return res.status(400).json({
        success: false,
        error:
          'El código de profesor/a es obligatorio.',
      });
    }

    /*
     * Número de copias.
     */

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

    /*
     * Curso y grupo cuando son copias para alumnado.
     */

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

    /*
     * Validación del PDF.
     */

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

    /*
     * La URL que llega del navegador debe ser
     * una URL privada de Vercel Blob.
     */

    if (
      !blobUrl ||
      !isValidPrivateBlobUrl(
        blobUrl
      )
    ) {
      return res.status(400).json({
        success: false,
        error:
          'La ubicación privada del PDF en Vercel Blob no es válida.',
      });
    }

    /*
     * Extraemos el pathname del Blob.
     */

    const blobObjectUrl =
      new URL(blobUrl);

    const pathname =
      decodeURIComponent(
        blobObjectUrl.pathname
          .replace(
            /^\/+/,
            ''
          )
      );

    /*
     * El PDF tiene que pertenecer a nuestra
     * carpeta de AlbaCopy.
     */

    if (
      !isValidBlobPathname(
        pathname
      )
    ) {
      return res.status(400).json({
        success: false,
        error:
          'La ubicación del PDF no pertenece al almacenamiento de AlbaCopy.',
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
     * Creamos una URL GET firmada y temporal
     * para que Resend pueda descargar el PDF privado.
     */

    const downloadValidUntil =
      Date.now() +
      SIGNED_DOWNLOAD_URL_MS;

    const readToken =
      await issueSignedToken({
        pathname,
        operations: ['get'],
        validUntil:
          downloadValidUntil,
      });

    const {
      presignedUrl:
        downloadUrl,
    } = await presignUrl(
      readToken,
      {
        pathname,
        operation: 'get',
        validUntil:
          downloadValidUntil,
        access: 'private',
      }
    );

    /*
     * Datos del correo.
     */

    const purposeLabel =
      purpose === 'alumnado'
        ? 'Copias para alumnado'
        : 'Uso personal';

    const subject =
      `[COPIAS IES ALBALAT] Prof. ${teacherCode} - ${copiesCount} copias`;

    const rows: Array<
      [string, string]
    > = [
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
        String(
          copiesCount
        ),
      ],
      [
        'Fin de las copias',
        purposeLabel,
      ],
      ...(purpose ===
      'alumnado'
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

    const htmlRows =
      rows
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
                ${escapeHtml(
                  label
                )}
              </td>

              <td style="
                padding:10px 12px;
                border:1px solid #e5e7eb;
                color:#111827;
              ">
                ${escapeHtml(
                  value
                )}
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

    /*
     * Variables de entorno de Resend.
     */

    const apiKey =
      clean(
        process.env
          .RESEND_API_KEY
      );

    if (!apiKey) {
      return res.status(503).json({
        success: false,
        error:
          'Falta RESEND_API_KEY en las variables de entorno de Vercel.',
      });
    }

    /*
     * Para las pruebas seguimos utilizando
     * RESEND_TO_EMAIL.
     *
     * No usamos el destinatario fijo directamente
     * porque actualmente estás probando con tu
     * propia cuenta de Resend.
     */

    const recipient =
      clean(
        process.env
          .RESEND_TO_EMAIL
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
        process.env
          .RESEND_FROM_EMAIL
      ) ||
      'onboarding@resend.dev';

    const resend =
      new Resend(apiKey);

    /*
     * Resend admite adjuntos mediante URL remota.
     * Aquí utilizamos nuestra URL GET firmada,
     * que solo es válida durante unos minutos.
     */

    const {
      data,
      error,
    } =
      await resend.emails.send(
        {
          from,
          to: [recipient],
          replyTo:
            educarexEmail,
          subject,
          html,
          attachments: [
            {
              filename:
                fileName,
              path:
                downloadUrl,
            },
          ],
        }
      );

    if (error) {
      console.error(
        'Resend error:',
        error
      );

      return res.status(502).json({
        success: false,
        error:
          'Resend no pudo enviar el correo. Comprueba la configuración del remitente y el tamaño del PDF.',
      });
    }

    const timestamp =
      new Date().toLocaleString(
        'es-ES',
        {
          timeZone:
            'Europe/Madrid',
        }
      );

    console.log(
      'Correo enviado correctamente:',
      {
        messageId:
          data?.id,
        recipient,
        fileName,
      }
    );

    return res.status(200).json({
      success: true,
      method: 'resend',
      message:
        'Correo enviado correctamente.',
      recipient,
      timestamp,
      messageId:
        data?.id,
      details: {
        teacherCode,
        copiesCount,
        purpose:
          purposeLabel,
        course:
          purpose ===
          'alumnado'
            ? course
            : undefined,
        group:
          purpose ===
          'alumnado'
            ? group
            : undefined,
        pdfName:
          fileName,
      },
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
          : 'Error interno al preparar o enviar la solicitud.',
    });
  }
}

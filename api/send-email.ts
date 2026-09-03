import type {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

import { Resend } from 'resend';

const MAX_PDF_SIZE =
  25 * 1024 * 1024;

const RECIPIENT =
  process.env.RESEND_TO_EMAIL ||
  'conserjeria.ies.albalat@educarex.es';

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL ||
  'onboarding@resend.dev';

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
        return parsed as Record<string, unknown>;
      }
    } catch {
      // JSON inválido.
    }
  }

  throw new Error(
    'No se ha recibido correctamente la petición.'
  );
}

function validateDownloadUrl(
  value: unknown
): URL {
  if (
    typeof value !== 'string' ||
    !value
  ) {
    throw new Error(
      'No se ha recibido la URL firmada del PDF.'
    );
  }

  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(
      'La URL del PDF no es válida.'
    );
  }

  /*
   * La URL debe ser HTTPS.
   */
  if (
    url.protocol !== 'https:'
  ) {
    throw new Error(
      'La URL del PDF debe utilizar HTTPS.'
    );
  }

  /*
   * Comprobamos que es una URL firmada
   * de Vercel Blob.
   *
   * Las URLs firmadas de Blob contienen
   * estos parámetros:
   *
   * vercel-blob-delegation
   * vercel-blob-signature
   */

  const hasDelegation =
    url.searchParams.has(
      'vercel-blob-delegation'
    );

  const hasSignature =
    url.searchParams.has(
      'vercel-blob-signature'
    );

  if (
    !hasDelegation ||
    !hasSignature
  ) {
    throw new Error(
      'La URL del PDF no es una URL firmada válida de Vercel Blob.'
    );
  }

  /*
   * Comprobamos que el archivo solicitado
   * pertenece a nuestra carpeta de AlbaCopy.
   */

  const pathname =
    decodeURIComponent(
      url.pathname
    );

  if (
    !pathname.startsWith(
      '/albacopy/'
    )
  ) {
    throw new Error(
      'La ruta del PDF no es válida.'
    );
  }

  /*
   * Solo aceptamos PDFs.
   */

  if (
    !pathname
      .toLowerCase()
      .endsWith('.pdf')
  ) {
    throw new Error(
      'El archivo recibido no es un PDF.'
    );
  }

  return url;
}

async function downloadPdf(
  downloadUrl: URL
): Promise<Buffer> {
  console.log(
    'Descargando PDF desde Vercel Blob...'
  );

  const response =
    await fetch(downloadUrl);

  if (!response.ok) {
    throw new Error(
      `Vercel Blob no pudo entregar el PDF. HTTP ${response.status}.`
    );
  }

  const contentLength =
    response.headers.get(
      'content-length'
    );

  if (contentLength) {
    const size =
      Number(contentLength);

    if (
      Number.isFinite(size) &&
      size > MAX_PDF_SIZE
    ) {
      throw new Error(
        'El PDF supera el tamaño máximo permitido de 25 MB.'
      );
    }
  }

  const arrayBuffer =
    await response.arrayBuffer();

  if (
    arrayBuffer.byteLength === 0
  ) {
    throw new Error(
      'Vercel Blob ha entregado un PDF vacío.'
    );
  }

  if (
    arrayBuffer.byteLength >
    MAX_PDF_SIZE
  ) {
    throw new Error(
      'El PDF supera el tamaño máximo permitido de 25 MB.'
    );
  }

  console.log(
    'PDF descargado correctamente:',
    {
      size:
        arrayBuffer.byteLength,
    }
  );

  return Buffer.from(
    arrayBuffer
  );
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (
    req.method !== 'POST'
  ) {
    return res.status(405).json({
      success: false,
      error:
        'Método no permitido.',
    });
  }

  try {
    const apiKey =
      process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error(
        'Falta RESEND_API_KEY en las variables de entorno de Vercel.'
      );
    }

    const body =
      parseRequestBody(
        req.body
      );

    /*
     * ---------------------------------------------------------
     * DATOS DEL FORMULARIO
     * ---------------------------------------------------------
     */

    const educarexEmail =
      typeof body.educarexEmail ===
      'string'
        ? body.educarexEmail.trim().toLowerCase()
        : '';

    const teacherCode =
      typeof body.teacherCode ===
      'string'
        ? body.teacherCode.trim().toUpperCase()
        : '';

    const copiesCount =
      Number(
        body.copiesCount
      );

    const purpose =
      typeof body.purpose ===
      'string'
        ? body.purpose.trim()
        : '';

    const course =
      typeof body.course ===
      'string'
        ? body.course.trim()
        : '';

    const group =
      typeof body.group ===
      'string'
        ? body.group.trim()
        : '';

    const fileName =
      typeof body.fileName ===
      'string'
        ? body.fileName.trim()
        : 'documento.pdf';

    const downloadUrl =
      validateDownloadUrl(
        body.downloadUrl
      );

    /*
     * ---------------------------------------------------------
     * VALIDACIONES
     * ---------------------------------------------------------
     */

    if (!educarexEmail) {
      throw new Error(
        'Falta el correo Educarex.'
      );
    }

    if (!teacherCode) {
      throw new Error(
        'Falta el código del profesor/a.'
      );
    }

    if (
      !Number.isInteger(
        copiesCount
      ) ||
      copiesCount < 1 ||
      copiesCount > 1000
    ) {
      throw new Error(
        'El número de copias no es válido.'
      );
    }

    /*
     * ---------------------------------------------------------
     * DESCARGAR PDF
     * ---------------------------------------------------------
     */

    const pdfBuffer =
      await downloadPdf(
        downloadUrl
      );

    /*
     * ---------------------------------------------------------
     * TEXTO DEL CORREO
     * ---------------------------------------------------------
     */

    const purposeText =
      purpose === 'alumnado'
        ? 'Copias para alumnado'
        : 'Uso personal';

    const html = `
      <h2>Solicitud de fotocopias - IES Albalat</h2>

      <p>
        <strong>Correo Educarex:</strong>
        ${escapeHtml(educarexEmail)}
      </p>

      <p>
        <strong>Código de profesor/a:</strong>
        ${escapeHtml(teacherCode)}
      </p>

      <p>
        <strong>Número de copias:</strong>
        ${copiesCount}
      </p>

      <p>
        <strong>Finalidad:</strong>
        ${escapeHtml(purposeText)}
      </p>

      ${
        purpose === 'alumnado'
          ? `
            <p>
              <strong>Curso:</strong>
              ${escapeHtml(course || 'N/A')}
            </p>

            <p>
              <strong>Grupo:</strong>
              ${escapeHtml(group || 'N/A')}
            </p>
          `
          : ''
      }

      <p>
        <strong>Archivo PDF:</strong>
        ${escapeHtml(fileName)}
      </p>

      <hr>

      <p>
        Solicitud enviada desde AlbaCopy.
      </p>
    `;

    /*
     * ---------------------------------------------------------
     * RESEND
     * ---------------------------------------------------------
     */

    const resend =
      new Resend(apiKey);

    const subject =
      `[COPIAS IES ALBALAT] Prof. ${teacherCode} - ${copiesCount} copias`;

    const result =
      await resend.emails.send({
        from: FROM_EMAIL,

        to: RECIPIENT,

        replyTo:
          educarexEmail ||
          undefined,

        subject,

        html,

        attachments: [
          {
            filename:
              fileName
                .toLowerCase()
                .endsWith('.pdf')
                ? fileName
                : `${fileName}.pdf`,

            content:
              pdfBuffer,
          },
        ],
      });

    if (result.error) {
      console.error(
        'Error devuelto por Resend:',
        result.error
      );

      throw new Error(
        result.error.message ||
          'Resend no pudo enviar el correo.'
      );
    }

    console.log(
      'Correo enviado correctamente:',
      result.data
    );

    return res.status(200).json({
      success: true,

      message:
        'Solicitud enviada correctamente.',

      id:
        result.data?.id ||
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

function escapeHtml(
  value: string
): string {
  return value
    .replace(
      /&/g,
      '&amp;'
    )
    .replace(
      /</g,
      '&lt;'
    )
    .replace(
      />/g,
      '&gt;'
    )
    .replace(
      /"/g,
      '&quot;'
    )
    .replace(
      /'/g,
      '&#039;'
    );
}

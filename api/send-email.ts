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

function validatePathname(
  value: unknown
): string {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    throw new Error(
      'No se ha recibido la ruta del PDF.'
    );
  }

  const pathname =
    value.trim();

  if (
    !pathname.startsWith(
      'albacopy/'
    )
  ) {
    throw new Error(
      'La ruta del PDF no pertenece a AlbaCopy.'
    );
  }

  if (
    pathname.includes('..')
  ) {
    throw new Error(
      'La ruta del PDF no es válida.'
    );
  }

  if (
    !pathname
      .toLowerCase()
      .endsWith('.pdf')
  ) {
    throw new Error(
      'El archivo recibido no es un PDF.'
    );
  }

  return pathname;
}

async function streamToBuffer(
  stream: ReadableStream<Uint8Array>
): Promise<Buffer> {
  const reader =
    stream.getReader();

  const chunks: Buffer[] = [];

  let totalSize = 0;

  try {
    while (true) {
      const {
        done,
        value,
      } =
        await reader.read();

      if (done) {
        break;
      }

      if (!value) {
        continue;
      }

      const chunk =
        Buffer.from(value);

      totalSize +=
        chunk.length;

      if (
        totalSize >
        MAX_PDF_SIZE
      ) {
        throw new Error(
          'El PDF supera el tamaño máximo permitido de 25 MB.'
        );
      }

      chunks.push(
        chunk
      );
    }
  } finally {
    reader.releaseLock();
  }

  if (
    totalSize === 0
  ) {
    throw new Error(
      'Vercel Blob ha entregado un PDF vacío.'
    );
  }

  return Buffer.concat(
    chunks,
    totalSize
  );
}

async function downloadPdfFromBlob(
  pathname: string
): Promise<Buffer> {
  console.log(
    'Recuperando PDF directamente mediante Vercel Blob SDK:',
    {
      pathname,
    }
  );

  const result =
    await get(
      pathname,
      {
        access:
          'private',

        useCache:
          false,
      }
    );

  if (
    !result
  ) {
    throw new Error(
      'Vercel Blob no encontró el PDF solicitado.'
    );
  }

  if (
    result.statusCode !==
    200
  ) {
    throw new Error(
      `Vercel Blob no pudo entregar el PDF. HTTP ${result.statusCode}.`
    );
  }

  if (
    !result.stream
  ) {
    throw new Error(
      'Vercel Blob no devolvió el contenido del PDF.'
    );
  }

  if (
    result.blob?.size &&
    result.blob.size >
      MAX_PDF_SIZE
  ) {
    throw new Error(
      'El PDF supera el tamaño máximo permitido de 25 MB.'
    );
  }

  const pdfBuffer =
    await streamToBuffer(
      result.stream
    );

  console.log(
    'PDF recuperado correctamente desde Vercel Blob:',
    {
      pathname,

      size:
        pdfBuffer.length,
    }
  );

  return pdfBuffer;
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
    // ------------------------------------------------
    // API KEY RESEND
    // ------------------------------------------------

    const apiKey =
      process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error(
        'Falta RESEND_API_KEY en las variables de entorno de Vercel.'
      );
    }

    // ------------------------------------------------
    // DATOS
    // ------------------------------------------------

    const body =
      parseRequestBody(
        req.body
      );

    // ------------------------------------------------
    // CORREO EDUCAREX
    // ------------------------------------------------

    const educarexEmail =
      typeof body.educarexEmail ===
      'string'
        ? body.educarexEmail
            .trim()
            .toLowerCase()
        : '';

    // ------------------------------------------------
    // CÓDIGO PROFESOR
    // ------------------------------------------------

    const teacherCode =
      typeof body.teacherCode ===
      'string'
        ? body.teacherCode
            .trim()
            .toUpperCase()
        : '';

    // ------------------------------------------------
    // COPIAS
    // ------------------------------------------------

    const copiesCount =
      Number(
        body.copiesCount
      );

    // ------------------------------------------------
    // FINALIDAD
    // ------------------------------------------------

    const purpose =
      typeof body.purpose ===
      'string'
        ? body.purpose.trim()
        : '';

    // ------------------------------------------------
    // CURSO
    // ------------------------------------------------

    const course =
      typeof body.course ===
      'string'
        ? body.course.trim()
        : '';

    // ------------------------------------------------
    // GRUPO
    // ------------------------------------------------

    const group =
      typeof body.group ===
      'string'
        ? body.group.trim()
        : '';

    // ------------------------------------------------
    // NOMBRE PDF
    // ------------------------------------------------

    const fileName =
      typeof body.fileName ===
      'string'
        ? body.fileName.trim()
        : 'documento.pdf';

    // ------------------------------------------------
    // PATHNAME VERCEL BLOB
    // ------------------------------------------------

    const pathname =
      validatePathname(
        body.pathname
      );

    // ------------------------------------------------
    // FORMATO
    // ------------------------------------------------

    const paperSize =
      body.paperSize === 'A3'
        ? 'A3'
        : body.paperSize === 'A4'
          ? 'A4'
          : '';

    // ------------------------------------------------
    // GRAPADO
    // ------------------------------------------------

    const stapled =
      body.stapled === true;

    // ------------------------------------------------
    // DOBLE CARA
    // ------------------------------------------------

    const doubleSided =
      body.doubleSided === true;

    const stapledText =
      stapled
        ? 'Grapado'
        : 'Sin grapar';

    const doubleSidedText =
      doubleSided
        ? 'A doble cara'
        : 'A una cara';

    // ------------------------------------------------
    // VALIDACIONES
    // ------------------------------------------------

    if (!educarexEmail) {
      throw new Error(
        'Falta el correo Educarex.'
      );
    }

    if (
      !educarexEmail.endsWith(
        '@educarex.es'
      )
    ) {
      throw new Error(
        'El correo debe pertenecer al dominio @educarex.es.'
      );
    }

    if (!teacherCode) {
      throw new Error(
        'Falta el código de profesor/a.'
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

    if (
      !paperSize
    ) {
      throw new Error(
        'El formato de papel no es válido.'
      );
    }

    if (
      purpose !==
        'alumnado' &&
      purpose !==
        'personal'
    ) {
      throw new Error(
        'La finalidad de las copias no es válida.'
      );
    }

    if (
      purpose ===
        'alumnado' &&
      (!course ||
        !group)
    ) {
      throw new Error(
        'Para copias de alumnado debes indicar Curso y Grupo.'
      );
    }

    // ------------------------------------------------
    // RECUPERAR PDF DESDE VERCEL BLOB
    // ------------------------------------------------

    const pdfBuffer =
      await downloadPdfFromBlob(
        pathname
      );

    // ------------------------------------------------
    // TEXTO FINALIDAD
    // ------------------------------------------------

    const purposeText =
      purpose ===
      'alumnado'
        ? 'Copias para alumnado'
        : 'Uso personal';

    // ------------------------------------------------
    // NOMBRE FINAL DEL ARCHIVO
    // ------------------------------------------------

    const finalFileName =
      fileName
        .toLowerCase()
        .endsWith('.pdf')
        ? fileName
        : `${fileName}.pdf`;

    // ------------------------------------------------
    // HTML DEL CORREO
    // ------------------------------------------------

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

      <p>
        <strong>Formato:</strong>
        ${escapeHtml(paperSize)}
      </p>

      <p>
        <strong>Grapado:</strong>
        ${escapeHtml(stapledText)}
      </p>

      <p>
        <strong>Caras:</strong>
        ${escapeHtml(doubleSidedText)}
      </p>

      ${
        purpose ===
        'alumnado'
          ? `
            <p>
              <strong>Curso:</strong>
              ${escapeHtml(
                course
              )}
            </p>

            <p>
              <strong>Grupo:</strong>
              ${escapeHtml(
                group
              )}
            </p>
          `
          : ''
      }

      <p>
        <strong>Archivo PDF:</strong>
        ${escapeHtml(
          finalFileName
        )}
      </p>

      <hr>

      <p>
        Solicitud enviada desde AlbaCopy.
      </p>
    `;

    // ------------------------------------------------
    // RESEND
    // ------------------------------------------------

    const resend =
      new Resend(
        apiKey
      );

    const subject =
      `[COPIAS IES ALBALAT] Prof. ${teacherCode} - ${copiesCount} copias`;

    const result =
      await resend.emails.send({
        from:
          FROM_EMAIL,

        to:
          RECIPIENT,

        replyTo:
          educarexEmail,

        subject,

        html,

        attachments: [
          {
            filename:
              finalFileName,

            content:
              pdfBuffer,
          },
        ],
      });

    // ------------------------------------------------
    // ERROR RESEND
    // ------------------------------------------------

    if (
      result.error
    ) {
      console.error(
        'Error devuelto por Resend:',
        result.error
      );

      throw new Error(
        result.error.message ||
          'Resend no pudo enviar el correo.'
      );
    }

    // ------------------------------------------------
    // ÉXITO
    // ------------------------------------------------

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

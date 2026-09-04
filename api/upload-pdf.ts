import {
  issueSignedToken,
  presignUrl,
} from '@vercel/blob';

import type {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

const MAX_PDF_SIZE =
  25 * 1024 * 1024;

const URL_VALIDITY_MS =
  15 * 60 * 1000;

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
    const body =
      parseRequestBody(
        req.body
      );

    // =================================================
    // COMPROBAR TIPO DE PETICIÓN
    // =================================================

    if (
      body.type !==
      'blob.generate-presigned-url'
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Tipo de petición de Blob no válido.',
      });
    }

    // =================================================
    // OBTENER NOMBRE ORIGINAL
    // =================================================

    const payload =
      body.payload as
        | {
            pathname?: unknown;
          }
        | undefined;

    const originalPathname =
      typeof payload?.pathname ===
      'string'
        ? payload.pathname.trim()
        : '';

    if (
      !originalPathname
    ) {
      return res.status(400).json({
        success: false,
        error:
          'No se ha recibido el nombre del archivo.',
      });
    }

    // =================================================
    // COMPROBAR QUE ES PDF
    // =================================================

    if (
      !originalPathname
        .toLowerCase()
        .endsWith('.pdf')
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Solo se permiten archivos PDF.',
      });
    }

    // =================================================
    // LIMPIAR NOMBRE DEL ARCHIVO
    // =================================================

    const safeFileName =
      originalPathname
        .split('/')
        .pop()
        ?.replace(
          /[^a-zA-Z0-9._-]/g,
          '_'
        ) ||
      'documento.pdf';

    // =================================================
    // CREAR PATHNAME ÚNICO
    // =================================================
    //
    // Este es el pathname que utilizaremos después
    // en send-email.ts para recuperar el PDF.
    //
    // IMPORTANTE:
    // addRandomSuffix: false hace que Vercel Blob
    // conserve exactamente este pathname.
    //
    // =================================================

    const pathname =
      `albacopy/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

    // =================================================
    // FECHA DE EXPIRACIÓN
    // =================================================

    const validUntil =
      Date.now() +
      URL_VALIDITY_MS;

    // =================================================
    // GENERAR TOKEN FIRMADO PARA SUBIDA
    // =================================================

    const uploadToken =
      await issueSignedToken({
        pathname,

        operations: [
          'put',
        ],

        validUntil,

        allowedContentTypes: [
          'application/pdf',
        ],

        maximumSizeInBytes:
          MAX_PDF_SIZE,
      });

    // =================================================
    // GENERAR URL FIRMADA DE SUBIDA
    // =================================================

    const uploadResult =
      await presignUrl(
        uploadToken,
        {
          pathname,

          operation:
            'put',

          validUntil,

          access:
            'private',

          // ------------------------------------------------
          // MUY IMPORTANTE
          // ------------------------------------------------
          //
          // Evita que Vercel Blob añada un sufijo aleatorio
          // al pathname real del objeto.
          //
          addRandomSuffix:
            false,
        }
      );

    const uploadUrl =
      uploadResult.presignedUrl;

    // =================================================
    // COMPROBAR URL
    // =================================================

    if (
      !uploadUrl ||
      typeof uploadUrl !== 'string'
    ) {
      throw new Error(
        'Vercel Blob no ha generado una URL de subida válida.'
      );
    }

    // =================================================
    // LOG
    // =================================================

    console.log(
      'URL de subida de Vercel Blob generada correctamente:',
      {
        pathname,

        hostname:
          new URL(
            uploadUrl
          ).hostname,

        addRandomSuffix:
          false,
      }
    );

    // =================================================
    // RESPUESTA
    // =================================================

    return res.status(200).json({
      success: true,

      uploadUrl,

      pathname,
    });
  } catch (error) {
    console.error(
      'Error en /api/upload-pdf:',
      error
    );

    return res.status(500).json({
      success: false,

      error:
        error instanceof Error
          ? error.message
          : 'No se pudo procesar la petición de Vercel Blob.',
    });
  }
}

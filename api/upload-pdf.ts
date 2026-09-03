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
      const parsed = JSON.parse(body);

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
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Método no permitido.',
    });
  }

  try {
    const body =
      parseRequestBody(req.body);

    if (
      body.type !==
      'blob.generate-presigned-url'
    ) {
      return res.status(400).json({
        success: false,
        error:
          'Tipo de petición de subida no válido.',
      });
    }

    const payload =
      body.payload as
        | {
            pathname?: unknown;
          }
        | undefined;

    const originalPathname =
      typeof payload?.pathname === 'string'
        ? payload.pathname
        : '';

    if (!originalPathname) {
      return res.status(400).json({
        success: false,
        error:
          'No se ha recibido el nombre del archivo.',
      });
    }

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

    /*
     * Limpiamos el nombre del archivo para evitar
     * caracteres problemáticos en Vercel Blob.
     */
    const safeFileName =
      originalPathname
        .split('/')
        .pop()
        ?.replace(
          /[^a-zA-Z0-9._-]/g,
          '_'
        ) ||
      'documento.pdf';

    /*
     * Cada archivo recibe una ruta única.
     */
    const pathname =
      `albacopy/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

    /*
     * =====================================================
     * URL FIRMADA DE SUBIDA
     * =====================================================
     */

    const uploadValidUntil =
      Date.now() +
      URL_VALIDITY_MS;

    const uploadToken =
      await issueSignedToken({
        pathname,
        operations: ['put'],
        validUntil:
          uploadValidUntil,
        allowedContentTypes: [
          'application/pdf',
        ],
        maximumSizeInBytes:
          MAX_PDF_SIZE,
      });

    const uploadResult =
      await presignUrl(
        uploadToken,
        {
          pathname,
          operation: 'put',
          validUntil:
            uploadValidUntil,
          access: 'private',
        }
      );

    const uploadUrl =
      uploadResult.presignedUrl;

    if (
      !uploadUrl ||
      typeof uploadUrl !== 'string'
    ) {
      throw new Error(
        'Vercel Blob no ha generado una URL de subida válida.'
      );
    }

    /*
     * =====================================================
     * URL FIRMADA DE DESCARGA
     * =====================================================
     *
     * Esta URL será enviada posteriormente a
     * /api/send-email.
     *
     * El servidor descargará el PDF desde esta URL
     * privada y se lo entregará a Resend como Buffer.
     */

    const downloadValidUntil =
      Date.now() +
      URL_VALIDITY_MS;

    const downloadToken =
      await issueSignedToken({
        pathname,
        operations: ['get'],
        validUntil:
          downloadValidUntil,
      });

    const downloadResult =
      await presignUrl(
        downloadToken,
        {
          pathname,
          operation: 'get',
          validUntil:
            downloadValidUntil,
          access: 'private',
        }
      );

    const downloadUrl =
      downloadResult.presignedUrl;

    if (
      !downloadUrl ||
      typeof downloadUrl !== 'string'
    ) {
      throw new Error(
        'Vercel Blob no ha generado una URL de descarga válida.'
      );
    }

    /*
     * No modificamos las URLs generadas por el SDK.
     * Es importante conservar exactamente las URLs
     * firmadas que devuelve Vercel Blob.
     */

    console.log(
      'URLs de Vercel Blob generadas correctamente:',
      {
        pathname,
        uploadHostname:
          new URL(uploadUrl).hostname,
        downloadHostname:
          new URL(downloadUrl).hostname,
      }
    );

    return res.status(200).json({
      success: true,
      uploadUrl,
      downloadUrl,
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
          : 'No se pudo generar la URL de Blob.',
    });
  }
}

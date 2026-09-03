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

const UPLOAD_URL_VALIDITY_MS =
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
     * Creamos una ruta única para cada PDF.
     */
    const pathname =
      `albacopy/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

    /*
     * Generamos ÚNICAMENTE la URL firmada de subida.
     */
    const validUntil =
      Date.now() +
      UPLOAD_URL_VALIDITY_MS;

    const token =
      await issueSignedToken({
        pathname,
        operations: ['put'],
        validUntil,
        allowedContentTypes: [
          'application/pdf',
        ],
        maximumSizeInBytes:
          MAX_PDF_SIZE,
      });

    const result =
      await presignUrl(
        token,
        {
          pathname,
          operation: 'put',
          validUntil,
          access: 'private',
        }
      );

    const uploadUrl =
      result.presignedUrl;

    if (
      !uploadUrl ||
      typeof uploadUrl !== 'string'
    ) {
      throw new Error(
        'Vercel Blob no ha generado una URL de subida válida.'
      );
    }

    console.log(
      'URL de subida generada correctamente:',
      {
        pathname,
        uploadHostname:
          new URL(uploadUrl).hostname,
      }
    );

    /*
     * IMPORTANTE:
     * Ya NO generamos ninguna URL GET aquí.
     *
     * El navegador subirá el archivo y después
     * send-email.ts lo leerá directamente mediante
     * get(pathname, { access: 'private' }).
     */

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
          : 'No se pudo generar la URL de Blob.',
    });
  }
}

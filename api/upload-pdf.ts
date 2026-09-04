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

function validatePathname(
  value: unknown
): string {
  if (
    typeof value !== 'string' ||
    !value.trim()
  ) {
    throw new Error(
      'No se ha recibido la ruta del archivo.'
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
      'La ruta del archivo no pertenece a AlbaCopy.'
    );
  }

  if (
    !pathname
      .toLowerCase()
      .endsWith('.pdf')
  ) {
    throw new Error(
      'Solo se permiten archivos PDF.'
    );
  }

  return pathname;
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
    // GENERAR URL DE SUBIDA
    // =================================================

    if (
      body.type ===
      'blob.generate-presigned-url'
    ) {
      const payload =
        body.payload as
          | {
              pathname?: unknown;
            }
          | undefined;

      const originalPathname =
        typeof payload?.pathname ===
        'string'
          ? payload.pathname
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

      const pathname =
        `albacopy/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

      const validUntil =
        Date.now() +
        URL_VALIDITY_MS;

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

      console.log(
        'URL de subida de Vercel Blob generada:',
        {
          pathname,

          hostname:
            new URL(
              uploadUrl
            ).hostname,
        }
      );

      return res.status(200).json({
        success: true,

        uploadUrl,

        pathname,
      });
    }

    // =================================================
    // GENERAR URL DE DESCARGA
    // =================================================

    if (
      body.type ===
      'blob.generate-download-url'
    ) {
      const payload =
        body.payload as
          | {
              pathname?: unknown;
            }
          | undefined;

      const pathname =
        validatePathname(
          payload?.pathname
        );

      const validUntil =
        Date.now() +
        URL_VALIDITY_MS;

      const downloadToken =
        await issueSignedToken({
          pathname,

          operations: [
            'get',
          ],

          validUntil,
        });

      const downloadResult =
  await presignUrl(
    downloadToken,
    {
      pathname,
      operation: 'get',
      validUntil,
      access: 'private',
      useCache: false,
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

      console.log(
        'URL privada de descarga generada:',
        {
          pathname,

          hostname:
            new URL(
              downloadUrl
            ).hostname,
        }
      );

      return res.status(200).json({
        success: true,

        downloadUrl,
      });
    }

    // =================================================
    // TIPO NO VÁLIDO
    // =================================================

    return res.status(400).json({
      success: false,
      error:
        'Tipo de petición de Blob no válido.',
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

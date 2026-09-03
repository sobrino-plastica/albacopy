import {
  issueSignedToken,
  presignUrl,
} from '@vercel/blob';

import type {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

const MAX_PDF_SIZE = 25 * 1024 * 1024;
const UPLOAD_URL_VALIDITY_MS = 15 * 60 * 1000;

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
    const body = parseRequestBody(
      req.body
    );

    /*
     * uploadPresigned() envía un evento con esta estructura:
     *
     * {
     *   type: "blob.generate-presigned-url",
     *   payload: {
     *     pathname,
     *     clientPayload,
     *     multipart
     *   }
     * }
     */

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
            clientPayload?: unknown;
            multipart?: unknown;
          }
        | undefined;

    const pathname =
      typeof payload?.pathname ===
      'string'
        ? payload.pathname
        : '';

    const multipart =
      payload?.multipart === true;

    if (!pathname) {
      return res.status(400).json({
        success: false,
        error:
          'No se ha recibido el nombre del archivo.',
      });
    }

    if (
      !pathname
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
     * El nombre original puede contener caracteres
     * extraños. Lo dejamos bajo una carpeta propia
     * y generamos además un sufijo aleatorio mediante
     * un pathname único.
     *
     * No utilizamos addRandomSuffix aquí porque
     * estamos trabajando con URLs firmadas.
     */

    const safeFileName =
      pathname
        .split('/')
        .pop()
        ?.replace(
          /[^a-zA-Z0-9._-]/g,
          '_'
        ) || 'documento.pdf';

    const uniquePathname =
      `albacopy/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

    /*
     * Creamos un token firmado usando la autenticación
     * OIDC de Vercel.
     *
     * El token queda limitado a:
     * - este pathname concreto
     * - operación PUT
     * - PDF
     * - máximo 25 MB
     * - 15 minutos
     */

    const validUntil =
      Date.now() +
      UPLOAD_URL_VALIDITY_MS;

    const signedToken =
      await issueSignedToken({
        pathname: uniquePathname,
        operations: ['put'],
        validUntil,
        allowedContentTypes: [
          'application/pdf',
        ],
        maximumSizeInBytes:
          MAX_PDF_SIZE,
      });

    /*
     * Generamos la URL firmada que utilizará
     * directamente el navegador para subir el PDF.
     */

    const { presignedUrl } =
      await presignUrl(
        signedToken,
        {
          pathname:
            uniquePathname,
          operation: 'put',
          validUntil,
          access: 'private',
        }
      );

    console.log(
      'URL firmada de subida generada:',
      {
        pathname:
          uniquePathname,
        multipart,
      }
    );

    return res.status(200).json({
      type:
        'blob.generate-presigned-url',
      presignedUrlPayload: {
        presignedUrl,
      },
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
          : 'No se pudo generar la URL de subida.',
    });
  }
}

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

function parseRequestBody(body: unknown): Record<string, unknown> {
  if (body && typeof body === 'object' && !Buffer.isBuffer(body)) {
    return body as Record<string, unknown>;
  }

  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body);

      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // Continúa hasta devolver el error de petición.
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
    const body = parseRequestBody(req.body);

    if (body.type !== 'blob.generate-presigned-url') {
      return res.status(400).json({
        success: false,
        error: 'Tipo de petición de subida no válido.',
      });
    }

    const payload = body.payload as
      | {
          pathname?: unknown;
          clientPayload?: unknown;
          multipart?: unknown;
        }
      | undefined;

    const originalPathname =
      typeof payload?.pathname === 'string'
        ? payload.pathname
        : '';

    const multipart = payload?.multipart === true;

    if (!originalPathname) {
      return res.status(400).json({
        success: false,
        error: 'No se ha recibido el nombre del archivo.',
      });
    }

    // Solo aceptamos PDF.
    if (!originalPathname.toLowerCase().endsWith('.pdf')) {
      return res.status(400).json({
        success: false,
        error: 'Solo se permiten archivos PDF.',
      });
    }

    // Limpiamos el nombre del archivo.
    const safeFileName =
      originalPathname
        .split('/')
        .pop()
        ?.replace(/[^a-zA-Z0-9._-]/g, '_') ||
      'documento.pdf';

    // Creamos un pathname único.
    const pathname =
      `albacopy/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

    const validUntil =
      Date.now() + UPLOAD_URL_VALIDITY_MS;

    /*
     * Generamos un token firmado para permitir:
     *
     * - PUT
     * - solo sobre este pathname
     * - máximo 25 MB
     * - únicamente application/pdf
     */
    const signedToken = await issueSignedToken({
      pathname,
      operations: ['put'],
      validUntil,
      allowedContentTypes: ['application/pdf'],
      maximumSizeInBytes: MAX_PDF_SIZE,
    });

    /*
     * Generamos la URL firmada.
     *
     * IMPORTANTE:
     * presignUrl devuelve:
     *
     * {
     *   presignedUrl,
     *   ...
     * }
     *
     * pero el cliente uploadPresigned necesita además
     * el payload firmado, no solamente la URL.
     */
    const presigned = await presignUrl(
      signedToken,
      {
        pathname,
        operation: 'put',
        validUntil,
        access: 'private',
      }
    );

    console.log(
      'URL firmada de subida generada:',
      {
        pathname,
        multipart,
        hasPresignedUrl:
          typeof presigned?.presignedUrl === 'string',
        hasDelegationToken:
          typeof presigned?.presignedUrlPayload?.delegationToken ===
          'string',
        hasSignature:
          typeof presigned?.presignedUrlPayload?.signature ===
          'string',
        hasParams:
          !!presigned?.presignedUrlPayload?.params,
      }
    );

    /*
     * uploadPresigned() espera exactamente este formato.
     */
    return res.status(200).json({
      type: 'blob.generate-presigned-url',
      presignedUrlPayload:
        presigned.presignedUrlPayload,
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

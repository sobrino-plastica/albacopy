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
      error:
        'Método no permitido.',
    });
  }

  try {
    const body =
      parseRequestBody(req.body);

    /*
     * Comprobamos que la petición corresponde
     * a una solicitud de URL firmada para subida.
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
          }
        | undefined;

    const originalPathname =
      typeof payload?.pathname ===
      'string'
        ? payload.pathname
        : '';

    if (!originalPathname) {
      return res.status(400).json({
        success: false,
        error:
          'No se ha recibido el nombre del archivo.',
      });
    }

    /*
     * Solo aceptamos archivos PDF.
     */

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
     * Limpiamos el nombre del archivo.
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
     * Generamos una ruta única dentro
     * de la carpeta de AlbaCopy.
     */

    const pathname =
      `albacopy/${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

    /*
     * La URL firmada será válida durante
     * 15 minutos.
     */

    const validUntil =
      Date.now() +
      UPLOAD_URL_VALIDITY_MS;

    /*
     * Creamos un token firmado que solo permite:
     *
     * - operación PUT
     * - PDF
     * - máximo 25 MB
     * - pathname concreto
     */

    const signedToken =
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

    /*
     * Generamos la URL firmada de subida.
     */

    const {
      presignedUrl:
        uploadUrl,
    } = await presignUrl(
      signedToken,
      {
        pathname,
        operation: 'put',
        validUntil,
        access: 'private',
      }
    );

    if (
      !uploadUrl ||
      typeof uploadUrl !==
        'string'
    ) {
      throw new Error(
        'Vercel Blob no ha generado una URL de subida válida.'
      );
    }

    /*
     * Obtenemos el ID del Blob Store.
     *
     * En proyectos conectados con OIDC,
     * Vercel proporciona BLOB_STORE_ID.
     *
     * Puede venir con el prefijo "store_",
     * que eliminamos para construir la URL
     * pública del objeto privado.
     */

    const storeId =
      String(
        process.env
          .BLOB_STORE_ID ||
          ''
      ).replace(
        /^store_/i,
        ''
      );

    if (!storeId) {
      throw new Error(
        'Falta BLOB_STORE_ID en las variables de entorno de Vercel.'
      );
    }

    /*
     * Esta NO es la URL firmada de subida.
     *
     * Es la URL real del objeto almacenado
     * en el Blob privado.
     *
     * Esta URL será la que posteriormente
     * enviaremos a /api/send-email.
     */

    const blobUrl =
      `https://${storeId}.private.blob.vercel-storage.com/${pathname}`;

    console.log(
      'URL de subida generada correctamente:',
      {
        pathname,
        hasUploadUrl: true,
        hasBlobUrl: true,
      }
    );

    return res.status(200).json({
      success: true,

      /*
       * URL temporal utilizada por el navegador
       * para hacer PUT del PDF.
       */
      uploadUrl,

      /*
       * URL real del objeto privado almacenado.
       */
      blobUrl,

      /*
       * Ruta interna del objeto.
       */
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
          : 'No se pudo generar la URL de subida.',
    });
  }
}

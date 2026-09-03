import {
  handleUpload,
  type HandleUploadBody,
} from '@vercel/blob/client';

import type {
  VercelRequest,
  VercelResponse,
} from '@vercel/node';

const MAX_PDF_SIZE = 25 * 1024 * 1024;

function parseRequestBody(
  body: unknown
): HandleUploadBody {
  if (
    body &&
    typeof body === 'object' &&
    !Buffer.isBuffer(body)
  ) {
    return body as HandleUploadBody;
  }

  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as HandleUploadBody;
    } catch {
      throw new Error(
        'El cuerpo de la petición no contiene JSON válido.'
      );
    }
  }

  throw new Error(
    'No se ha recibido correctamente la petición de subida.'
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

    const jsonResponse = await handleUpload({
      body,
      request: req,

      onBeforeGenerateToken: async (
        pathname
      ) => {
        const lowerPathname =
          pathname.toLowerCase();

        if (
          !lowerPathname.endsWith('.pdf')
        ) {
          throw new Error(
            'Solo se permiten archivos PDF.'
          );
        }

        return {
          allowedContentTypes: [
            'application/pdf',
          ],

          addRandomSuffix: true,

          tokenPayload: JSON.stringify({
            maxSize: MAX_PDF_SIZE,
          }),
        };
      },

      onUploadCompleted: async ({
        blob,
      }) => {
        console.log(
          'PDF subido correctamente a Vercel Blob:',
          {
            url: blob.url,
            pathname: blob.pathname,
            size: blob.size,
          }
        );
      },
    });

    return res.status(200).json(
      jsonResponse
    );
  } catch (error) {
    console.error(
      'Error en /api/upload-pdf:',
      error
    );

    return res.status(400).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'No se pudo generar el token de subida.',
    });
  }
}

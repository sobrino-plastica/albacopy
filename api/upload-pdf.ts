import {
  handleUpload,
  type HandleUploadBody,
} from '@vercel/blob/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const MAX_PDF_SIZE = 25 * 1024 * 1024;

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
      typeof req.body === 'string'
        ? JSON.parse(req.body)
        : req.body;

    const uploadBody = body as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body: uploadBody,
      request: req,

      onBeforeGenerateToken: async (
        pathname,
        clientPayload,
        multipart
      ) => {
        const originalName = pathname
          .split('/')
          .pop()
          ?.toLowerCase() || '';

        if (!originalName.endsWith('.pdf')) {
          throw new Error(
            'Solo se permiten archivos PDF.'
          );
        }

        return {
          allowedContentTypes: ['application/pdf'],
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({
            clientPayload,
            multipart,
            maxSize: MAX_PDF_SIZE,
          }),
        };
      },

      onUploadCompleted: async ({ blob }) => {
        console.log(
          'PDF subido correctamente a Vercel Blob:',
          blob.url
        );
      },
    });

    return res.status(200).json(jsonResponse);
  } catch (error: any) {
    console.error(
      'Error en /api/upload-pdf:',
      error?.message || error
    );

    return res.status(400).json({
      success: false,
      error:
        error?.message ||
        'No se pudo preparar la subida del PDF.',
    });
  }
}

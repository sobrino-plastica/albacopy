import {
  get,
  del,
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

async function deletePdfFromBlob(
  pathname: string
): Promise<void> {
  try {
    console.log(
      'Eliminando PDF temporal de Vercel Blob:',
      {
        pathname,
      }
    );

    await del(
      pathname,
      {
        token:
          process.env.BLOB_READ_WRITE_TOKEN,
      }
    );

    console.log(
      'PDF eliminado correctamente de Vercel Blob:',
      {
        pathname,
      }
    );
  } catch (error) {
    /*
     * El correo ya se ha enviado correctamente.
     *
     * Por tanto, un fallo al eliminar el archivo NO debe
     * provocar que la solicitud aparezca como fallida.
     *
     * El PDF simplemente permanecerá temporalmente en Blob
     * y quedará registrado en los logs de Vercel.
     */

    console.error(
      'AVISO: el correo se envió correctamente, pero no se pudo eliminar el PDF de Vercel Blob:',
      {
        pathname,
        error,
      }
    );
  }
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
    const apiKey =
      process.env.RESEND_API_KEY;

    if (!apiKey) {
      throw new Error(
        'Falta RESEND_API_KEY en las variables de entorno de Vercel.'
      );
    }

    const body =
      parseRequestBody(
        req.body
      );

    const educarexEmail =
      typeof body.educarexEmail ===
      'string'
        ? body.educarexEmail
            .trim()
            .toLowerCase()
        : '';

    const teacherCode =
      typeof body.teacherCode ===
      'string'
        ? body.teacherCode
            .trim()
            .toUpperCase()
        : '';

    const copiesCount =
      Number(
        body.copiesCount
      );

    const purpose =
      typeof body.purpose ===
      'string'
        ? body.purpose.trim()
        : '';

    const course =
      typeof body.course ===
      'string'
        ? body.course.trim()
        : '';

    const group =
      typeof body.group ===
      'string'
        ? body.group.trim()
        : '';

    const fileName =
      typeof body.fileName ===
      'string'
        ? body.fileName.trim()
        : 'documento.pdf';

    const pathname =
      validatePathname(
        body.pathname
      );

    const paperSize =
      body.paperSize === 'A3'
        ? 'A3'
        : body.paperSize === 'A4'
          ? 'A4'
          : '';

    const stapled =
      body.stapled === true;

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

    /*
     * ============================================================
     * 1. RECUPERAR PDF DESDE VERCEL BLOB
     * ============================================================
     */

    const pdfBuffer =
      await downloadPdfFromBlob(
        pathname
      );

    const purposeText =
      purpose ===
      'alumnado'
        ? 'Copias para alumnado'
        : 'Uso personal';

    const finalFileName =
      fileName
        .toLowerCase()
        .endsWith('.pdf')
        ? fileName
        : `${fileName}.pdf`;

    /*
     * ============================================================
     * 2. CREAR CORREO HTML
     * ============================================================
     */

    const html = `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta
            http-equiv="Content-Type"
            content="text/html; charset=UTF-8"
          />

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />

          <title>Solicitud de fotocopias - IES Albalat</title>
        </head>

        <body
          style="
            margin: 0;
            padding: 0;
            background-color: #f4f6f8;
            font-family: Arial, Helvetica, sans-serif;
            color: #222222;
          "
        >

          <div
            style="
              width: 100%;
              padding: 30px 15px;
              box-sizing: border-box;
            "
          >

            <table
              role="presentation"
              width="100%"
              cellpadding="0"
              cellspacing="0"
              border="0"
              style="
                max-width: 680px;
                margin: 0 auto;
                background-color: #ffffff;
                border-collapse: collapse;
                border-radius: 8px;
                overflow: hidden;
              "
            >

              <!-- CABECERA -->

              <tr>
                <td
                  style="
                    background-color: #1f2937;
                    padding: 24px 28px;
                    color: #ffffff;
                  "
                >

                  <div
                    style="
                      font-size: 22px;
                      font-weight: bold;
                      line-height: 1.3;
                    "
                  >
                    Solicitud de fotocopias
                  </div>

                  <div
                    style="
                      margin-top: 5px;
                      font-size: 14px;
                      color: #d1d5db;
                    "
                  >
                    IES Albalat
                  </div>

                </td>
              </tr>

              <!-- CONTENIDO -->

              <tr>
                <td
                  style="
                    padding: 28px;
                  "
                >

                  <div
                    style="
                      font-size: 16px;
                      line-height: 1.5;
                      margin-bottom: 20px;
                    "
                  >
                    Se ha recibido una nueva solicitud
                    de fotocopias con los siguientes datos:
                  </div>

                  <!-- TABLA DE DATOS -->

                  <table
                    role="presentation"
                    width="100%"
                    cellpadding="0"
                    cellspacing="0"
                    border="0"
                    style="
                      width: 100%;
                      border-collapse: collapse;
                      border: 1px solid #d1d5db;
                      font-size: 14px;
                    "
                  >

                    <!-- CORREO -->

                    <tr>
                      <td
                        style="
                          width: 38%;
                          padding: 12px 14px;
                          background-color: #f3f4f6;
                          border-bottom: 1px solid #d1d5db;
                          font-weight: bold;
                          color: #374151;
                        "
                      >
                        Correo Educarex
                      </td>

                      <td
                        style="
                          padding: 12px 14px;
                          border-bottom: 1px solid #d1d5db;
                          color: #111827;
                          word-break: break-word;
                        "
                      >
                        ${escapeHtml(
                          educarexEmail
                        )}
                      </td>
                    </tr>

                    <!-- PROFESOR -->

                    <tr>
                      <td
                        style="
                          padding: 12px 14px;
                          background-color: #f9fafb;
                          border-bottom: 1px solid #d1d5db;
                          font-weight: bold;
                          color: #374151;
                        "
                      >
                        Código de profesor/a
                      </td>

                      <td
                        style="
                          padding: 12px 14px;
                          border-bottom: 1px solid #d1d5db;
                          color: #111827;
                          font-weight: bold;
                        "
                      >
                        ${escapeHtml(
                          teacherCode
                        )}
                      </td>
                    </tr>

                    <!-- COPIAS -->

                    <tr>
                      <td
                        style="
                          padding: 12px 14px;
                          background-color: #f3f4f6;
                          border-bottom: 1px solid #d1d5db;
                          font-weight: bold;
                          color: #374151;
                        "
                      >
                        Número de copias
                      </td>

                      <td
                        style="
                          padding: 12px 14px;
                          border-bottom: 1px solid #d1d5db;
                          color: #111827;
                          font-weight: bold;
                        "
                      >
                        ${copiesCount}
                      </td>
                    </tr>

                    <!-- FINALIDAD -->

                    <tr>
                      <td
                        style="
                          padding: 12px 14px;
                          background-color: #f9fafb;
                          border-bottom: 1px solid #d1d5db;
                          font-weight: bold;
                          color: #374151;
                        "
                      >
                        Finalidad
                      </td>

                      <td
                        style="
                          padding: 12px 14px;
                          border-bottom: 1px solid #d1d5db;
                          color: #111827;
                        "
                      >
                        ${escapeHtml(
                          purposeText
                        )}
                      </td>
                    </tr>

                    ${
                      purpose ===
                      'alumnado'
                        ? `
                          <!-- CURSO -->

                          <tr>
                            <td
                              style="
                                padding: 12px 14px;
                                background-color: #f3f4f6;
                                border-bottom: 1px solid #d1d5db;
                                font-weight: bold;
                                color: #374151;
                              "
                            >
                              Curso
                            </td>

                            <td
                              style="
                                padding: 12px 14px;
                                border-bottom: 1px solid #d1d5db;
                                color: #111827;
                              "
                            >
                              ${escapeHtml(
                                course
                              )}
                            </td>
                          </tr>

                          <!-- GRUPO -->

                          <tr>
                            <td
                              style="
                                padding: 12px 14px;
                                background-color: #f9fafb;
                                border-bottom: 1px solid #d1d5db;
                                font-weight: bold;
                                color: #374151;
                              "
                            >
                              Grupo
                            </td>

                            <td
                              style="
                                padding: 12px 14px;
                                border-bottom: 1px solid #d1d5db;
                                color: #111827;
                              "
                            >
                              ${escapeHtml(
                                group
                              )}
                            </td>
                          </tr>
                        `
                        : ''
                    }

                    <!-- FORMATO -->

                    <tr>
                      <td
                        style="
                          padding: 12px 14px;
                          background-color: #f3f4f6;
                          border-bottom: 1px solid #d1d5db;
                          font-weight: bold;
                          color: #374151;
                        "
                      >
                        Formato
                      </td>

                      <td
                        style="
                          padding: 12px 14px;
                          border-bottom: 1px solid #d1d5db;
                          color: #111827;
                        "
                      >
                        ${escapeHtml(
                          paperSize
                        )}
                      </td>
                    </tr>

                    <!-- GRAPADO -->

                    <tr>
                      <td
                        style="
                          padding: 12px 14px;
                          background-color: #f9fafb;
                          border-bottom: 1px solid #d1d5db;
                          font-weight: bold;
                          color: #374151;
                        "
                      >
                        Grapado
                      </td>

                      <td
                        style="
                          padding: 12px 14px;
                          border-bottom: 1px solid #d1d5db;
                          color: #111827;
                        "
                      >
                        ${escapeHtml(
                          stapledText
                        )}
                      </td>
                    </tr>

                    <!-- CARAS -->

                    <tr>
                      <td
                        style="
                          padding: 12px 14px;
                          background-color: #f3f4f6;
                          border-bottom: 1px solid #d1d5db;
                          font-weight: bold;
                          color: #374151;
                        "
                      >
                        Caras
                      </td>

                      <td
                        style="
                          padding: 12px 14px;
                          border-bottom: 1px solid #d1d5db;
                          color: #111827;
                        "
                      >
                        ${escapeHtml(
                          doubleSidedText
                        )}
                      </td>
                    </tr>

                    <!-- ARCHIVO -->

                    <tr>
                      <td
                        style="
                          padding: 12px 14px;
                          background-color: #f9fafb;
                          font-weight: bold;
                          color: #374151;
                        "
                      >
                        Archivo PDF
                      </td>

                      <td
                        style="
                          padding: 12px 14px;
                          color: #111827;
                          word-break: break-word;
                        "
                      >
                        ${escapeHtml(
                          finalFileName
                        )}
                      </td>
                    </tr>

                  </table>

                  <!-- AVISO DEL ADJUNTO -->

                  <div
                    style="
                      margin-top: 22px;
                      padding: 14px 16px;
                      background-color: #f3f4f6;
                      border-left: 4px solid #6b7280;
                      font-size: 14px;
                      line-height: 1.5;
                      color: #374151;
                    "
                  >
                    El documento PDF correspondiente
                    se encuentra adjunto a este correo.
                  </div>

                </td>
              </tr>

              <!-- PIE -->

              <tr>
                <td
                  style="
                    padding: 18px 28px;
                    background-color: #f9fafb;
                    border-top: 1px solid #e5e7eb;
                    text-align: center;
                    font-size: 12px;
                    color: #6b7280;
                  "
                >
                  Solicitud enviada desde AlbaCopy
                </td>
              </tr>

            </table>

          </div>

        </body>
      </html>
    `;

    /*
     * ============================================================
     * 3. ENVIAR CORREO MEDIANTE RESEND
     * ============================================================
     */

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

    /*
     * ============================================================
     * 4. COMPROBAR QUE RESEND HA ACEPTADO EL ENVÍO
     * ============================================================
     */

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

    console.log(
      'Correo enviado correctamente:',
      result.data
    );

    /*
     * ============================================================
     * 5. ELIMINAR PDF DE VERCEL BLOB
     * ============================================================
     *
     * MUY IMPORTANTE:
     *
     * Esta operación se realiza DESPUÉS de que Resend confirme
     * el envío.
     *
     * Si el borrado falla, NO hacemos fallar la solicitud,
     * porque el correo ya ha sido enviado correctamente.
     */

    await deletePdfFromBlob(
      pathname
    );

    /*
     * ============================================================
     * 6. RESPUESTA FINAL A LA WEB
     * ============================================================
     */

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

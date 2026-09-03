import React, { useEffect, useState } from 'react';

import {
  Send,
  Hash,
  Mail,
  Copy as CopyIcon,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

import { Header } from './components/Header';
import { PurposeToggle } from './components/PurposeToggle';
import { PdfDropzone } from './components/PdfDropzone';
import { SendingStatusModal } from './components/SendingStatusModal';

import type {
  AttachedPdf,
  CopyPurpose,
  SendEmailResponse,
} from './types';

const FIXED_RECIPIENT =
  'conserjeria.ies.albalat@educarex.es';

const MAX_PDF_SIZE =
  25 * 1024 * 1024;

const STORAGE_EMAIL =
  'albacopy_educarex_email';

const STORAGE_TEACHER_CODE =
  'albacopy_teacher_code';

const STORAGE_COURSE =
  'albacopy_course';

const STORAGE_GROUP =
  'albacopy_group';

interface UploadResponse {
  uploadUrl: string;
  pathname: string;
}

export default function App() {
  const [educarexEmail, setEducarexEmail] =
    useState('');

  const [teacherCode, setTeacherCode] =
    useState('');

  const [copiesCount, setCopiesCount] =
    useState(25);

  const [purpose, setPurpose] =
    useState<CopyPurpose>('alumnado');

  const [course, setCourse] =
    useState('');

  const [group, setGroup] =
    useState('');

  const [pdf, setPdf] =
    useState<AttachedPdf | null>(null);

  const [validationError, setValidationError] =
    useState('');

  const [sendingStatus, setSendingStatus] =
    useState<
      'idle' | 'sending' | 'success'
    >('idle');

  const [loadingStepText, setLoadingStepText] =
    useState(
      'Preparando la solicitud...'
    );

  const [uploadProgress, setUploadProgress] =
    useState(0);

  const [sendResult, setSendResult] =
    useState<SendEmailResponse | null>(
      null
    );

  const [isStatusModalOpen, setIsStatusModalOpen] =
    useState(false);

  useEffect(() => {
    const savedEmail =
      localStorage.getItem(
        STORAGE_EMAIL
      );

    const savedTeacherCode =
      localStorage.getItem(
        STORAGE_TEACHER_CODE
      );

    const savedCourse =
      localStorage.getItem(
        STORAGE_COURSE
      );

    const savedGroup =
      localStorage.getItem(
        STORAGE_GROUP
      );

    if (savedEmail) {
      setEducarexEmail(
        savedEmail
      );
    }

    if (savedTeacherCode) {
      setTeacherCode(
        savedTeacherCode
      );
    }

    if (savedCourse) {
      setCourse(savedCourse);
    }

    if (savedGroup) {
      setGroup(savedGroup);
    }
  }, []);

  useEffect(() => {
    if (
      educarexEmail.trim()
    ) {
      localStorage.setItem(
        STORAGE_EMAIL,
        educarexEmail.trim()
      );
    }
  }, [educarexEmail]);

  useEffect(() => {
    if (
      teacherCode.trim()
    ) {
      localStorage.setItem(
        STORAGE_TEACHER_CODE,
        teacherCode.trim()
      );
    }
  }, [teacherCode]);

  useEffect(() => {
    if (course.trim()) {
      localStorage.setItem(
        STORAGE_COURSE,
        course.trim()
      );
    }
  }, [course]);

  useEffect(() => {
    if (group.trim()) {
      localStorage.setItem(
        STORAGE_GROUP,
        group.trim()
      );
    }
  }, [group]);

  const cleanEmail =
    educarexEmail
      .trim()
      .toLowerCase();

  const cleanCode =
    teacherCode
      .trim()
      .toUpperCase();

  const cleanCourse =
    course.trim();

  const cleanGroup =
    group.trim();

  const purposeText =
    purpose === 'alumnado'
      ? 'Copias para alumnado'
      : 'Uso personal';

  const emailSubject =
    `[COPIAS IES ALBALAT] Prof. ${
      cleanCode || 'XXX'
    } - ${copiesCount} copias`;

  const emailBody = [
    'Solicitud de fotocopias · IES Albalat',
    '',
    `Correo Educarex: ${
      cleanEmail || 'N/A'
    }`,
    `Código de profesor/a: ${
      cleanCode || 'N/A'
    }`,
    `Número de copias: ${copiesCount}`,
    `Fin de las copias: ${purposeText}`,
    ...(purpose === 'alumnado'
      ? [
          `Curso: ${
            cleanCourse || 'N/A'
          }`,
          `Grupo: ${
            cleanGroup || 'N/A'
          }`,
        ]
      : []),
    `Archivo PDF: ${
      pdf?.name || 'Sin adjunto'
    }`,
  ].join('\n');

  const isEmailValid = (
    email: string
  ) => {
    return /^[^\s@]+@educarex\.es$/i.test(
      email.trim()
    );
  };

  const adjustCopies = (
    amount: number
  ) => {
    setCopiesCount(
      (current) => {
        const next =
          current + amount;

        return Math.min(
          1000,
          Math.max(
            1,
            next
          )
        );
      }
    );
  };

  const resetForm = () => {
    setEducarexEmail('');
    setTeacherCode('');
    setCopiesCount(25);
    setPurpose('alumnado');
    setCourse('');
    setGroup('');
    setPdf(null);

    setValidationError('');
    setSendResult(null);
    setSendingStatus('idle');
    setUploadProgress(0);

    setLoadingStepText(
      'Preparando la solicitud...'
    );

    setIsStatusModalOpen(false);

    localStorage.removeItem(
      STORAGE_EMAIL
    );

    localStorage.removeItem(
      STORAGE_TEACHER_CODE
    );

    localStorage.removeItem(
      STORAGE_COURSE
    );

    localStorage.removeItem(
      STORAGE_GROUP
    );
  };

  /*
   * ---------------------------------------------------------
   * SUBIR PDF A VERCEL BLOB
   * ---------------------------------------------------------
   *
   * 1. Pedimos a nuestra API una URL PUT firmada.
   * 2. Subimos el PDF directamente a Vercel Blob.
   * 3. Conservamos el pathname del archivo.
   *
   * El PDF NO pasa por la función de Vercel durante
   * la subida.
   */

  const uploadPdfToBlob = async (
    file: File
  ): Promise<UploadResponse> => {
    setLoadingStepText(
      'Preparando la subida segura...'
    );

    setUploadProgress(0);

    /*
     * ---------------------------------------------------------
     * 1. SOLICITAR URL FIRMADA DE SUBIDA
     * ---------------------------------------------------------
     */

    const response =
      await fetch(
        '/api/upload-pdf',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            type:
              'blob.generate-presigned-url',

            payload: {
              pathname:
                file.name,
            },
          }),
        }
      );

    let data:
      | {
          success?: boolean;
          uploadUrl?: string;
          pathname?: string;
          error?: string;
        }
      | null = null;

    try {
      data =
        await response.json();
    } catch {
      data = null;
    }

    if (
      !response.ok ||
      !data?.success ||
      !data.uploadUrl ||
      !data.pathname
    ) {
      throw new Error(
        data?.error ||
          `No se pudo preparar la subida (${response.status}).`
      );
    }

    /*
     * ---------------------------------------------------------
     * 2. SUBIR EL PDF DIRECTAMENTE A VERCEL BLOB
     * ---------------------------------------------------------
     *
     * Utilizamos XMLHttpRequest para poder mostrar
     * el porcentaje de subida.
     */

    await new Promise<void>(
      (
        resolve,
        reject
      ) => {
        const xhr =
          new XMLHttpRequest();

        xhr.open(
          'PUT',
          data!.uploadUrl!,
          true
        );

        xhr.setRequestHeader(
          'Content-Type',
          'application/pdf'
        );

        xhr.upload.onprogress =
          (event) => {
            if (
              event.lengthComputable
            ) {
              const progress =
                Math.round(
                  (event.loaded /
                    event.total) *
                    100
                );

              setUploadProgress(
                progress
              );

              if (
                progress < 100
              ) {
                setLoadingStepText(
                  `Subiendo PDF... ${progress}%`
                );
              } else {
                setLoadingStepText(
                  'PDF subido. Preparando el correo...'
                );
              }
            }
          };

        xhr.onload = () => {
          if (
            xhr.status >= 200 &&
            xhr.status < 300
          ) {
            setUploadProgress(
              100
            );

            setLoadingStepText(
              'PDF subido. Preparando el correo...'
            );

            resolve();
          } else {
            reject(
              new Error(
                `Vercel Blob rechazó la subida (${xhr.status}).`
              )
            );
          }
        };

        xhr.onerror = () => {
          reject(
            new Error(
              'No se pudo conectar con Vercel Blob para subir el PDF.'
            )
          );
        };

        xhr.onabort = () => {
          reject(
            new Error(
              'La subida del PDF fue cancelada.'
            )
          );
        };

        xhr.send(file);
      }
    );

    /*
     * ---------------------------------------------------------
     * 3. DEVOLVER EL PATHNAME
     * ---------------------------------------------------------
     *
     * El pathname identifica el archivo dentro del
     * Blob privado.
     *
     * send-email.ts utilizará ese pathname para recuperar
     * el PDF directamente mediante el SDK de Vercel Blob.
     */

    return {
      uploadUrl:
        data.uploadUrl,

      pathname:
        data.pathname,
    };
  };

  /*
   * ---------------------------------------------------------
   * ENVIAR SOLICITUD POR CORREO
   * ---------------------------------------------------------
   *
   * Enviamos el pathname del PDF.
   *
   * send-email.ts recuperará el archivo directamente
   * desde el Blob privado.
   */

  const sendEmailRequest =
    async (
      pathname: string
    ): Promise<SendEmailResponse> => {
      setLoadingStepText(
        'Enviando correo a conserjería...'
      );

      const response =
        await fetch(
          '/api/send-email',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              educarexEmail:
                cleanEmail,

              teacherCode:
                cleanCode,

              copiesCount,

              purpose,

              course:
                cleanCourse,

              group:
                cleanGroup,

              fileName:
                pdf?.name ||
                'documento.pdf',

              /*
               * Ruta del PDF dentro del
               * Blob privado.
               */

              pathname,

              fileSize:
                pdf?.size || 0,
            }),
          }
        );

      let data:
        | SendEmailResponse
        | {
            success?: boolean;
            error?: string;
          }
        | null = null;

      try {
        data =
          await response.json();
      } catch {
        data = null;
      }

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            `Error del servidor (${response.status}).`
        );
      }

      return data as SendEmailResponse;
    };

  /*
   * ---------------------------------------------------------
   * ENVIAR FORMULARIO
   * ---------------------------------------------------------
   */

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setValidationError('');

    /*
     * CORREO
     */

    if (
      !isEmailValid(
        cleanEmail
      )
    ) {
      setValidationError(
        'Introduce un correo Educarex válido (@educarex.es).'
      );

      return;
    }

    /*
     * CÓDIGO DE PROFESOR/A
     */

    if (!cleanCode) {
      setValidationError(
        'Introduce el código de profesor/a.'
      );

      return;
    }

    /*
     * NÚMERO DE COPIAS
     */

    if (
      !Number.isInteger(
        copiesCount
      ) ||
      copiesCount < 1 ||
      copiesCount > 1000
    ) {
      setValidationError(
        'El número de copias debe estar entre 1 y 1000.'
      );

      return;
    }

    /*
     * DATOS DE ALUMNADO
     */

    if (
      purpose ===
      'alumnado'
    ) {
      if (!cleanCourse) {
        setValidationError(
          'Indica el curso para las copias destinadas al alumnado.'
        );

        return;
      }

      if (!cleanGroup) {
        setValidationError(
          'Indica el grupo para las copias destinadas al alumnado.'
        );

        return;
      }
    }

    /*
     * PDF
     */

    if (!pdf) {
      setValidationError(
        'Adjunta el archivo PDF que quieres enviar.'
      );

      return;
    }

    if (pdf.size <= 0) {
      setValidationError(
        'El archivo PDF está vacío.'
      );

      return;
    }

    if (
      pdf.size >
      MAX_PDF_SIZE
    ) {
      setValidationError(
        'El PDF no puede superar los 25 MB.'
      );

      return;
    }

    const isPdf =
      pdf.type ===
        'application/pdf' ||
      pdf.name
        .toLowerCase()
        .endsWith('.pdf');

    if (!isPdf) {
      setValidationError(
        'El archivo adjunto debe ser un PDF.'
      );

      return;
    }

    /*
     * ---------------------------------------------------------
     * INICIAR ENVÍO
     * ---------------------------------------------------------
     */

    setSendResult(null);

    setSendingStatus(
      'sending'
    );

    setIsStatusModalOpen(
      true
    );

    setUploadProgress(0);

    try {
      /*
       * -------------------------------------------------------
       * PASO 1
       *
       * Obtener URL PUT y subir PDF.
       * -------------------------------------------------------
       */

      const blob =
        await uploadPdfToBlob(
          pdf.file
        );

      /*
       * -------------------------------------------------------
       * PASO 2
       *
       * Enviar pathname a send-email.ts.
       * -------------------------------------------------------
       */

      const result =
        await sendEmailRequest(
          blob.pathname
        );

      /*
       * -------------------------------------------------------
       * ÉXITO
       * -------------------------------------------------------
       */

      setUploadProgress(
        100
      );

      setLoadingStepText(
        'Correo enviado correctamente.'
      );

      setSendResult(
        result
      );

      setSendingStatus(
        'success'
      );
    } catch (error) {
      console.error(
        'Error enviando solicitud:',
        error
      );

      setSendingStatus(
        'idle'
      );

      setIsStatusModalOpen(
        false
      );

      setUploadProgress(
        0
      );

      setValidationError(
        error instanceof Error
          ? error.message
          : 'No se pudo enviar la solicitud.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <Header
        onReset={
          resetForm
        }
      />

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-zinc-950 shadow-sm">
              <CopyIcon
                size={21}
              />
            </div>

            <div>
              <h2 className="text-2xl font-bold tracking-tight text-zinc-100">
                Solicitud de fotocopias
              </h2>

              <p className="text-sm text-zinc-400">
                IES Albalat
              </p>
            </div>
          </div>

          <p className="max-w-2xl text-sm leading-6 text-zinc-400">
            Completa los datos de la
            solicitud y adjunta el
            documento PDF. La petición
            será enviada directamente a
            conserjería.
          </p>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6"
        >
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                <Mail
                  size={18}
                />
              </div>

              <div>
                <h2 className="font-semibold text-zinc-100">
                  Datos del profesor/a
                </h2>

                <p className="text-xs text-zinc-400">
                  Utiliza tu cuenta
                  institucional de
                  Educarex.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="educarexEmail"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Correo Educarex
                </label>

                <input
                  id="educarexEmail"
                  type="email"
                  value={
                    educarexEmail
                  }
                  onChange={(
                    event
                  ) =>
                    setEducarexEmail(
                      event.target
                        .value
                    )
                  }
                  placeholder="nombre@educarex.es"
                  autoComplete="email"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                />
              </div>

              <div>
                <label
                  htmlFor="teacherCode"
                  className="mb-2 block text-sm font-medium text-zinc-300"
                >
                  Código de profesor/a
                </label>

                <div className="relative">
                  <Hash
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                  />

                  <input
                    id="teacherCode"
                    type="text"
                    value={
                      teacherCode
                    }
                    onChange={(
                      event
                    ) =>
                      setTeacherCode(
                        event.target.value.toUpperCase()
                      )
                    }
                    placeholder="PR-01"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-3 pl-10 pr-4 text-sm uppercase text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="font-semibold text-zinc-100">
                Número de copias
              </h2>

              <p className="text-xs text-zinc-400">
                Indica cuántas copias
                necesitas.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  adjustCopies(
                    -1
                  )
                }
                disabled={
                  copiesCount <=
                  1
                }
                aria-label="Reducir número de copias"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 text-xl font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
              >
                −
              </button>

              <input
                type="number"
                min={1}
                max={1000}
                value={
                  copiesCount
                }
                onChange={(
                  event
                ) => {
                  const value =
                    Number(
                      event.target
                        .value
                    );

                  if (
                    !Number.isNaN(
                      value
                    )
                  ) {
                    setCopiesCount(
                      Math.min(
                        1000,
                        Math.max(
                          1,
                          Math.floor(
                            value
                          )
                        )
                      )
                    );
                  }
                }}
                className="h-11 w-28 rounded-xl border border-zinc-700 bg-zinc-950 text-center text-lg font-semibold text-zinc-100 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              />

              <button
                type="button"
                onClick={() =>
                  adjustCopies(
                    1
                  )
                }
                disabled={
                  copiesCount >=
                  1000
                }
                aria-label="Aumentar número de copias"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 text-xl font-medium text-zinc-300 transition hover:bg-zinc-800 disabled:opacity-50"
              >
                +
              </button>

              <span className="ml-1 text-sm text-zinc-500">
                copias
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-sm sm:p-6">
            <PurposeToggle
              value={purpose}
              onChange={
                setPurpose
              }
              course={course}
              onCourseChange={
                setCourse
              }
              group={group}
              onGroupChange={
                setGroup
              }
            />
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="font-semibold text-zinc-100">
                Documento
              </h2>

              <p className="text-xs text-zinc-400">
                Adjunta el PDF que debe
                imprimirse.
              </p>
            </div>

            <PdfDropzone
              pdf={pdf}
              onPdfChange={
                setPdf
              }
            />
          </section>

          {validationError && (
            <div className="flex items-start gap-3 rounded-xl border border-rose-900/70 bg-rose-950/40 p-4 text-sm text-rose-300">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />

              <div>
                <p className="font-medium">
                  No se puede enviar la
                  solicitud
                </p>

                <p className="mt-1">
                  {
                    validationError
                  }
                </p>
              </div>
            </div>
          )}

          <section className="rounded-xl border border-emerald-900/60 bg-emerald-950/20 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={20}
                className="mt-0.5 shrink-0 text-emerald-400"
              />

              <div>
                <p className="text-sm font-semibold text-zinc-100">
                  Envío seguro
                </p>

                <p className="mt-1 text-sm leading-6 text-zinc-400">
                  El documento se envía
                  directamente al sistema
                  de correo configurado
                  para la conserjería del
                  IES Albalat.
                </p>

                <p className="mt-2 text-xs text-zinc-500">
                  Destinatario:{' '}
                  {
                    FIXED_RECIPIENT
                  }
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={
                resetForm
              }
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-zinc-800"
            >
              Limpiar
            </button>

            <button
              type="submit"
              disabled={
                sendingStatus ===
                'sending'
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-sm transition hover:bg-emerald-400 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send
                size={17}
              />

              {sendingStatus ===
              'sending'
                ? 'Enviando...'
                : 'Enviar solicitud'}
            </button>
          </div>
        </form>

        {sendResult &&
          sendingStatus ===
            'success' && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-800/60 bg-emerald-950/30 p-4">
              <CheckCircle2
                size={20}
                className="mt-0.5 shrink-0 text-emerald-400"
              />

              <div>
                <p className="text-sm font-semibold text-emerald-300">
                  Solicitud enviada
                  correctamente
                </p>

                <p className="mt-1 text-sm text-emerald-400/80">
                  La petición ha sido
                  enviada a
                  conserjería.
                </p>
              </div>
            </div>
          )}
      </main>

      <SendingStatusModal
        isOpen={
          isStatusModalOpen
        }
        status={
          sendingStatus
        }
        onClose={() => {
          if (
            sendingStatus !==
            'sending'
          ) {
            setIsStatusModalOpen(
              false
            );
          }
        }}
        result={
          sendResult
        }
        emailSubject={
          emailSubject
        }
        emailBody={
          emailBody
        }
        pdfName={
          pdf?.name
        }
        loadingStepText={
          loadingStepText
        }
        uploadProgress={
          uploadProgress
        }
      />
    </div>
  );
}

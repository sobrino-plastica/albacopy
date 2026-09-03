import React, {
  useEffect,
  useState,
} from 'react';

import {
  Send,
  Hash,
  Mail,
  Copy as CopyIcon,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

import Header from './components/Header';
import PurposeToggle from './components/PurposeToggle';
import PdfDropzone from './components/PdfDropzone';
import SendingStatusModal from './components/SendingStatusModal';

import type {
  AttachedPdf,
  CopyPurpose,
} from './types';

const RECIPIENT =
  'conserjeria.ies.albalat@educarex.es';

const MAX_PDF_SIZE =
  25 * 1024 * 1024;

interface UploadResponse {
  success: boolean;
  uploadUrl: string;
  downloadUrl: string;
  pathname: string;
  error?: string;
}

interface SendEmailResponse {
  success: boolean;
  message?: string;
  error?: string;
  id?: string | null;
}

type SendingStatus =
  | 'idle'
  | 'uploading'
  | 'sending'
  | 'success'
  | 'error';

export default function App() {
  const [
    educarexEmail,
    setEducarexEmail,
  ] = useState('');

  const [
    teacherCode,
    setTeacherCode,
  ] = useState('');

  const [
    copiesCount,
    setCopiesCount,
  ] = useState(25);

  const [
    purpose,
    setPurpose,
  ] = useState<CopyPurpose>(
    'alumnado'
  );

  const [
    course,
    setCourse,
  ] = useState('');

  const [
    group,
    setGroup,
  ] = useState('');

  const [
    pdf,
    setPdf,
  ] = useState<AttachedPdf | null>(
    null
  );

  const [
    validationError,
    setValidationError,
  ] = useState('');

  const [
    sendingStatus,
    setSendingStatus,
  ] = useState<SendingStatus>(
    'idle'
  );

  const [
    loadingStepText,
    setLoadingStepText,
  ] = useState('');

  const [
    uploadProgress,
    setUploadProgress,
  ] = useState(0);

  const [
    sendResult,
    setSendResult,
  ] = useState('');

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);

  /*
   * Recuperar datos guardados.
   */
  useEffect(() => {
    const savedEmail =
      localStorage.getItem(
        'albacopy_email'
      );

    const savedTeacherCode =
      localStorage.getItem(
        'albacopy_teacher_code'
      );

    const savedCourse =
      localStorage.getItem(
        'albacopy_course'
      );

    const savedGroup =
      localStorage.getItem(
        'albacopy_group'
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
      setCourse(
        savedCourse
      );
    }

    if (savedGroup) {
      setGroup(
        savedGroup
      );
    }
  }, []);

  /*
   * Guardar datos automáticamente.
   */
  useEffect(() => {
    localStorage.setItem(
      'albacopy_email',
      educarexEmail
    );
  }, [educarexEmail]);

  useEffect(() => {
    localStorage.setItem(
      'albacopy_teacher_code',
      teacherCode
    );
  }, [teacherCode]);

  useEffect(() => {
    localStorage.setItem(
      'albacopy_course',
      course
    );
  }, [course]);

  useEffect(() => {
    localStorage.setItem(
      'albacopy_group',
      group
    );
  }, [group]);

  /*
   * Asunto del correo.
   */
  const emailSubject =
    `[COPIAS IES ALBALAT] Prof. ${
      teacherCode.trim()
        ? teacherCode
            .trim()
            .toUpperCase()
        : 'XXX'
    } - ${copiesCount} copias`;

  /*
   * Validar formulario.
   */
  const validateForm =
    (): boolean => {
      setValidationError('');

      const cleanEmail =
        educarexEmail.trim();

      const cleanTeacherCode =
        teacherCode.trim();

      if (!cleanEmail) {
        setValidationError(
          'Introduce tu correo Educarex.'
        );
        return false;
      }

      if (
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
          cleanEmail
        )
      ) {
        setValidationError(
          'Introduce un correo electrónico válido.'
        );
        return false;
      }

      if (!cleanTeacherCode) {
        setValidationError(
          'Introduce tu código de profesor/a.'
        );
        return false;
      }

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
        return false;
      }

      if (!pdf) {
        setValidationError(
          'Adjunta un archivo PDF.'
        );
        return false;
      }

      if (
        pdf.file.size >
        MAX_PDF_SIZE
      ) {
        setValidationError(
          'El PDF supera el tamaño máximo de 25 MB.'
        );
        return false;
      }

      if (
        purpose === 'alumnado'
      ) {
        if (!course.trim()) {
          setValidationError(
            'Indica el curso.'
          );
          return false;
        }

        if (!group.trim()) {
          setValidationError(
            'Indica el grupo.'
          );
          return false;
        }
      }

      return true;
    };

  /*
   * Subir el PDF directamente
   * a Vercel Blob usando la URL
   * firmada que genera nuestro backend.
   */
  const uploadPdfToBlob =
    async (
      file: File
    ): Promise<UploadResponse> => {
      setUploadProgress(0);
      setLoadingStepText(
        'Preparando la subida del PDF…'
      );

      const prepareResponse =
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

      let prepareData:
        | UploadResponse
        | null = null;

      try {
        prepareData =
          await prepareResponse.json();
      } catch {
        throw new Error(
          'Vercel no devolvió una respuesta válida al preparar la subida.'
        );
      }

      if (
        !prepareResponse.ok ||
        !prepareData?.success ||
        !prepareData.uploadUrl ||
        !prepareData.downloadUrl ||
        !prepareData.pathname
      ) {
        throw new Error(
          prepareData?.error ||
            'No se pudo preparar la subida del PDF.'
        );
      }

      setLoadingStepText(
        'Subiendo PDF a almacenamiento seguro…'
      );

      /*
       * Utilizamos XMLHttpRequest para
       * poder mostrar progreso real.
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
            prepareData.uploadUrl
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
              resolve();
            } else {
              reject(
                new Error(
                  `Vercel Blob rechazó la subida. HTTP ${xhr.status}.`
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

      setLoadingStepText(
        'PDF subido correctamente.'
      );

      return prepareData;
    };

  /*
   * Enviar todos los datos al backend.
   *
   * MUY IMPORTANTE:
   * aquí enviamos downloadUrl,
   * NO pathname para recuperar
   * el archivo.
   */
  const sendEmailRequest =
    async (
      downloadUrl: string
    ): Promise<SendEmailResponse> => {
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
                educarexEmail
                  .trim()
                  .toLowerCase(),

              teacherCode:
                teacherCode
                  .trim()
                  .toUpperCase(),

              copiesCount,

              purpose,

              course:
                course.trim(),

              group:
                group.trim(),

              fileName:
                pdf?.file.name ||
                'documento.pdf',

              downloadUrl,
            }),
          }
        );

      let data:
        | SendEmailResponse
        | null = null;

      try {
        data =
          await response.json();
      } catch {
        throw new Error(
          'El servidor no devolvió una respuesta válida.'
        );
      }

      if (
        !response.ok ||
        !data?.success
      ) {
        throw new Error(
          data?.error ||
            'No se pudo enviar la solicitud.'
        );
      }

      return data;
    };

  /*
   * Enviar formulario completo.
   */
  const handleSubmit =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      if (!validateForm()) {
        return;
      }

      setSendingStatus(
        'uploading'
      );

      setModalOpen(true);

      setSendResult('');

      try {
        /*
         * 1. Subir PDF.
         */
        const uploadResult =
          await uploadPdfToBlob(
            pdf!.file
          );

        /*
         * 2. Enviar correo usando
         * la URL firmada de descarga.
         */
        setSendingStatus(
          'sending'
        );

        setLoadingStepText(
          'Enviando solicitud por correo…'
        );

        const result =
          await sendEmailRequest(
            uploadResult.downloadUrl
          );

        setSendingStatus(
          'success'
        );

        setSendResult(
          result.message ||
            'Solicitud enviada correctamente.'
        );

        setUploadProgress(
          100
        );
      } catch (error) {
        console.error(
          'Error al enviar solicitud:',
          error
        );

        setSendingStatus(
          'error'
        );

        setSendResult(
          error instanceof Error
            ? error.message
            : 'No se pudo enviar la solicitud.'
        );
      }
    };

  /*
   * Cerrar modal y limpiar
   * después de un envío correcto.
   */
  const handleCloseModal =
    () => {
      if (
        sendingStatus ===
          'success'
      ) {
        setPdf(null);
        setValidationError('');
        setSendingStatus('idle');
        setSendResult('');
        setUploadProgress(0);
        setLoadingStepText('');
        setModalOpen(false);
        return;
      }

      if (
        sendingStatus ===
        'error'
      ) {
        setSendingStatus('idle');
        setModalOpen(false);
      }
    };

  /*
   * Datos para mostrar al usuario.
   */
  const cleanTeacherCode =
    teacherCode
      .trim()
      .toUpperCase();

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header />

      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Solicitud de fotocopias
          </h1>

          <p className="mt-2 text-slate-400">
            Completa los datos y adjunta el PDF que
            quieres enviar a conserjería.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          {/* DATOS DEL PROFESOR */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
                <Mail
                  size={20}
                  className="text-slate-300"
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold">
                  Datos del profesor/a
                </h2>

                <p className="text-sm text-slate-400">
                  Estos datos se conservarán para futuras solicitudes.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="educarexEmail"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Correo Educarex
                </label>

                <input
                  id="educarexEmail"
                  type="email"
                  value={
                    educarexEmail
                  }
                  onChange={(event) =>
                    setEducarexEmail(
                      event.target.value
                    )
                  }
                  placeholder="nombre.apellido@educarex.es"
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-slate-500 focus:ring-2 focus:ring-slate-700"
                />
              </div>

              <div>
                <label
                  htmlFor="teacherCode"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Código de profesor/a
                </label>

                <div className="relative">
                  <Hash
                    size={18}
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500"
                  />

                  <input
                    id="teacherCode"
                    type="text"
                    value={
                      teacherCode
                    }
                    onChange={(event) =>
                      setTeacherCode(
                        event.target.value
                      )
                    }
                    placeholder="PR-01"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 py-3 pl-11 pr-4 uppercase text-white outline-none transition placeholder:text-slate-600 focus:border-slate-500 focus:ring-2 focus:ring-slate-700"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* COPIAS */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800">
                <CopyIcon
                  size={20}
                  className="text-slate-300"
                />
              </div>

              <div>
                <h2 className="text-lg font-semibold">
                  Número de copias
                </h2>

                <p className="text-sm text-slate-400">
                  Indica cuántas copias necesitas.
                </p>
              </div>
            </div>

            <div className="max-w-xs">
              <label
                htmlFor="copiesCount"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Copias
              </label>

              <input
                id="copiesCount"
                type="number"
                min={1}
                max={1000}
                value={
                  copiesCount
                }
                onChange={(event) =>
                  setCopiesCount(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-700"
              />
            </div>
          </section>

          {/* FINALIDAD */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl sm:p-6">
            <PurposeToggle
              purpose={purpose}
              onChange={
                setPurpose
              }
            />

            {purpose ===
              'alumnado' && (
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="course"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Curso
                  </label>

                  <input
                    id="course"
                    type="text"
                    value={course}
                    onChange={(event) =>
                      setCourse(
                        event.target.value
                      )
                    }
                    placeholder="Ej. 2º ESO"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-slate-500 focus:ring-2 focus:ring-slate-700"
                  />
                </div>

                <div>
                  <label
                    htmlFor="group"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Grupo
                  </label>

                  <input
                    id="group"
                    type="text"
                    value={group}
                    onChange={(event) =>
                      setGroup(
                        event.target.value
                      )
                    }
                    placeholder="Ej. A"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-slate-500 focus:ring-2 focus:ring-slate-700"
                  />
                </div>
              </div>
            )}
          </section>

          {/* PDF */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl sm:p-6">
            <div className="mb-5">
              <h2 className="text-lg font-semibold">
                Archivo PDF
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Tamaño máximo: 25 MB.
              </p>
            </div>

            <PdfDropzone
              pdf={pdf}
              onPdfChange={
                setPdf
              }
              maxSize={
                MAX_PDF_SIZE
              }
            />
          </section>

          {/* ERROR */}
          {validationError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-900/60 bg-red-950/30 p-4 text-red-300">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0"
              />

              <p className="text-sm">
                {validationError}
              </p>
            </div>
          )}

          {/* SEGURIDAD */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800">
                <ShieldCheck
                  size={21}
                  className="text-slate-300"
                />
              </div>

              <div>
                <h3 className="font-semibold">
                  Envío seguro
                </h3>

                <p className="mt-1 text-sm leading-6 text-slate-400">
                  El PDF se sube directamente a un
                  almacenamiento privado de Vercel Blob.
                  La solicitud se procesa en el servidor
                  y el archivo se adjunta al correo.
                </p>
              </div>
            </div>
          </section>

          {/* RESUMEN */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">
              Resumen
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-slate-800 pb-3">
                <span className="text-slate-400">
                  Profesor/a
                </span>

                <span className="text-right font-medium">
                  {cleanTeacherCode ||
                    '—'}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b border-slate-800 pb-3">
                <span className="text-slate-400">
                  Copias
                </span>

                <span className="font-medium">
                  {copiesCount}
                </span>
              </div>

              <div className="flex justify-between gap-4 border-b border-slate-800 pb-3">
                <span className="text-slate-400">
                  Finalidad
                </span>

                <span className="text-right font-medium">
                  {purpose ===
                  'alumnado'
                    ? 'Copias para alumnado'
                    : 'Uso personal'}
                </span>
              </div>

              {purpose ===
                'alumnado' && (
                <>
                  <div className="flex justify-between gap-4 border-b border-slate-800 pb-3">
                    <span className="text-slate-400">
                      Curso
                    </span>

                    <span className="font-medium">
                      {course ||
                        '—'}
                    </span>
                  </div>

                  <div className="flex justify-between gap-4 border-b border-slate-800 pb-3">
                    <span className="text-slate-400">
                      Grupo
                    </span>

                    <span className="font-medium">
                      {group ||
                        '—'}
                    </span>
                  </div>
                </>
              )}

              <div className="flex justify-between gap-4 pt-1">
                <span className="text-slate-400">
                  Archivo
                </span>

                <span className="max-w-[60%] truncate text-right font-medium">
                  {pdf?.file.name ||
                    '—'}
                </span>
              </div>
            </div>
          </section>

          {/* BOTÓN */}
          <button
            type="submit"
            disabled={
              sendingStatus ===
                'uploading' ||
              sendingStatus ===
                'sending'
            }
            className="flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-6 py-4 text-base font-bold text-slate-950 shadow-xl transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Send
              size={20}
            />

            {sendingStatus ===
            'uploading'
              ? 'Subiendo PDF…'
              : sendingStatus ===
                'sending'
              ? 'Enviando solicitud…'
              : 'Enviar solicitud'}
          </button>

          <p className="text-center text-xs text-slate-500">
            La solicitud se enviará a{' '}
            {RECIPIENT}
          </p>

          {/* ÉXITO */}
          {sendResult &&
            sendingStatus ===
              'success' && (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-900/60 bg-emerald-950/30 p-4 text-emerald-300">
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0"
                />

                <div>
                  <p className="font-medium">
                    Solicitud enviada
                    correctamente.
                  </p>

                  <p className="mt-1 text-sm text-emerald-400/80">
                    {sendResult}
                  </p>

                  <p className="mt-2 text-xs text-emerald-400/60">
                    Asunto: {emailSubject}
                  </p>
                </div>
              </div>
            )}
        </form>
      </main>

      <SendingStatusModal
        open={modalOpen}
        status={
          sendingStatus
        }
        progress={
          uploadProgress
        }
        stepText={
          loadingStepText
        }
        error={
          sendingStatus ===
          'error'
            ? sendResult
            : ''
        }
        onClose={
          handleCloseModal
        }
      />
    </div>
  );
}

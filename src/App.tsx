import React, { useState, useEffect } from 'react';
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
import {
  CopyPurpose,
  AttachedPdf,
  SendEmailResponse,
} from './types';

const FIXED_RECIPIENT =
  'conserjeria.ies.albalat@educarex.es';

const EMAIL_STORAGE_KEY =
  'ies_albalat_educarex_email';

const CODE_STORAGE_KEY =
  'ies_albalat_teacher_code';

const MAX_PDF_SIZE =
  25 * 1024 * 1024;

export default function App() {
  // --------------------------------------------------
  // DATOS GUARDADOS
  // --------------------------------------------------

  const [educarexEmail, setEducarexEmail] =
    useState<string>(() => {
      return (
        localStorage.getItem(
          EMAIL_STORAGE_KEY
        ) || ''
      );
    });

  const [teacherCode, setTeacherCode] =
    useState<string>(() => {
      return (
        localStorage.getItem(
          CODE_STORAGE_KEY
        ) || ''
      );
    });

  const [copiesCount, setCopiesCount] =
    useState<number>(25);

  const [purpose, setPurpose] =
    useState<CopyPurpose>('alumnado');

  const [course, setCourse] =
    useState<string>('');

  const [group, setGroup] =
    useState<string>('');

  const [pdf, setPdf] =
    useState<AttachedPdf | null>(null);

  // --------------------------------------------------
  // ESTADO
  // --------------------------------------------------

  const [validationError, setValidationError] =
    useState<string | null>(null);

  const [sendingStatus, setSendingStatus] =
    useState<'idle' | 'sending' | 'success'>(
      'idle'
    );

  const [loadingStepText, setLoadingStepText] =
    useState<string>('');

  const [uploadProgress, setUploadProgress] =
    useState<number>(0);

  const [sendResult, setSendResult] =
    useState<SendEmailResponse | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] =
    useState<boolean>(false);

  // --------------------------------------------------
  // GUARDAR PREFERENCIAS
  // --------------------------------------------------

  useEffect(() => {
    if (educarexEmail) {
      localStorage.setItem(
        EMAIL_STORAGE_KEY,
        educarexEmail
      );
    }
  }, [educarexEmail]);

  useEffect(() => {
    if (teacherCode) {
      localStorage.setItem(
        CODE_STORAGE_KEY,
        teacherCode
      );
    }
  }, [teacherCode]);

  // --------------------------------------------------
  // VALIDACIÓN EMAIL
  // --------------------------------------------------

  const isEmailValid =
    educarexEmail
      .trim()
      .toLowerCase()
      .endsWith('@educarex.es');

  const handleAutocompleteDomain = () => {
    const trimmed =
      educarexEmail.trim();

    if (!trimmed) {
      setEducarexEmail(
        'profesor@educarex.es'
      );
    } else if (
      !trimmed.includes('@')
    ) {
      setEducarexEmail(
        `${trimmed}@educarex.es`
      );
    } else if (
      !trimmed
        .toLowerCase()
        .endsWith('@educarex.es')
    ) {
      const userPart =
        trimmed.split('@')[0];

      setEducarexEmail(
        `${userPart}@educarex.es`
      );
    }
  };

  // --------------------------------------------------
  // COPIAS
  // --------------------------------------------------

  const adjustCopies = (
    delta: number
  ) => {
    setCopiesCount((prev) =>
      Math.min(
        1000,
        Math.max(
          1,
          prev + delta
        )
      )
    );
  };

  // --------------------------------------------------
  // REINICIAR
  // --------------------------------------------------

  const handleReset = () => {
    if (
      confirm(
        '¿Deseas restablecer los campos del formulario?'
      )
    ) {
      setCopiesCount(25);
      setPurpose('alumnado');
      setCourse('');
      setGroup('');
      setPdf(null);
      setValidationError(null);
      setSendResult(null);
      setSendingStatus('idle');
      setLoadingStepText('');
      setUploadProgress(0);
    }
  };

  // --------------------------------------------------
  // ENVÍO
  // --------------------------------------------------

  const handleSubmit = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setValidationError(null);
    setSendResult(null);

    // ------------------------------------------------
    // DATOS LIMPIOS
    // ------------------------------------------------

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

    // ------------------------------------------------
    // VALIDACIONES FRONTEND
    // ------------------------------------------------

    if (
      !cleanEmail.endsWith(
        '@educarex.es'
      )
    ) {
      setValidationError(
        'Debes utilizar una cuenta oficial @educarex.es.'
      );
      return;
    }

    if (!cleanCode) {
      setValidationError(
        'El código de profesor/a es obligatorio.'
      );
      return;
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
      return;
    }

    if (
      purpose === 'alumnado' &&
      (!cleanCourse ||
        !cleanGroup)
    ) {
      setValidationError(
        'Para copias de alumnado debes indicar el Curso y el Grupo.'
      );
      return;
    }

    if (!pdf) {
      setValidationError(
        'Debes adjuntar un archivo PDF.'
      );
      return;
    }

    if (!pdf.file) {
      setValidationError(
        'No se ha podido acceder al archivo PDF seleccionado.'
      );
      return;
    }

    if (
      pdf.file.size >
      MAX_PDF_SIZE
    ) {
      setValidationError(
        'El PDF supera el límite de 25 MB.'
      );
      return;
    }

    // ------------------------------------------------
    // DATOS VISUALES DEL MODAL
    // ------------------------------------------------

    const purposeText =
      purpose === 'alumnado'
        ? 'Copias para alumnado'
        : 'Uso personal';

    const emailSubject =
      `[COPIAS IES ALBALAT] Prof. ${cleanCode} - ${copiesCount} copias`;

    const emailBody = [
      'Solicitud de fotocopias · IES Albalat',
      '',
      `Correo Educarex: ${cleanEmail}`,
      `Código de profesor/a: ${cleanCode}`,
      `Número de copias: ${copiesCount}`,
      `Fin de las copias: ${purposeText}`,
      ...(purpose === 'alumnado'
        ? [
            `Curso: ${cleanCourse}`,
            `Grupo: ${cleanGroup}`,
          ]
        : []),
      `Archivo PDF: ${pdf.name}`,
    ].join('\n');

    // ------------------------------------------------
    // ABRIR MODAL
    // ------------------------------------------------

    setSendingStatus('sending');
    setIsStatusModalOpen(true);

    setLoadingStepText(
      'Preparando el PDF...'
    );

    setUploadProgress(0);

    try {
      // =================================================
      // PASO 1
      // SOLICITAR URL FIRMADAS A VERCEL BLOB
      // =================================================

      setLoadingStepText(
        'Preparando el PDF...'
      );

      setUploadProgress(10);

      const uploadUrlResponse =
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
                  pdf.name,
              },
            }),
          }
        );

      let uploadData:
        | {
            success?: boolean;
            uploadUrl?: string;
            downloadUrl?: string;
            pathname?: string;
            error?: string;
          }
        | null = null;

      try {
        uploadData =
          await uploadUrlResponse.json();
      } catch {
        uploadData = {
          success: false,
          error:
            'El servidor devolvió una respuesta no válida al preparar el PDF.',
        };
      }

      if (
        !uploadUrlResponse.ok ||
        !uploadData?.success ||
        !uploadData.uploadUrl ||
        !uploadData.downloadUrl
      ) {
        throw new Error(
          uploadData?.error ||
            'No se pudo preparar el PDF para su envío.'
        );
      }

      // =================================================
      // PASO 2
      // SUBIR PDF DIRECTAMENTE A VERCEL BLOB
      // =================================================

      setLoadingStepText(
        'Subiendo el PDF de forma segura...'
      );

      setUploadProgress(35);

      const blobUploadResponse =
        await fetch(
          uploadData.uploadUrl,
          {
            method: 'PUT',

            headers: {
              'Content-Type':
                'application/pdf',
            },

            body: pdf.file,
          }
        );

      if (
        !blobUploadResponse.ok
      ) {
        let blobError =
          '';

        try {
          blobError =
            await blobUploadResponse.text();
        } catch {
          // No se pudo leer el error.
        }

        console.error(
          'Error subiendo PDF a Vercel Blob:',
          {
            status:
              blobUploadResponse.status,
            statusText:
              blobUploadResponse.statusText,
            error:
              blobError,
          }
        );

        throw new Error(
          `No se pudo subir el PDF al almacenamiento seguro. HTTP ${blobUploadResponse.status}.`
        );
      }

      // =================================================
      // PASO 3
      // ENVIAR DATOS A /api/send-email
      // =================================================

      setLoadingStepText(
        'Enviando solicitud a conserjería...'
      );

      setUploadProgress(70);

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

              copiesCount:
                copiesCount,

              purpose:
                purpose,

              course:
                cleanCourse,

              group:
                cleanGroup,

              fileName:
                pdf.name,

              downloadUrl:
                uploadData.downloadUrl,
            }),
          }
        );

      // =================================================
      // PASO 4
      // LEER RESPUESTA DE RESEND
      // =================================================

      setUploadProgress(90);

      let result:
        | {
            success?: boolean;
            message?: string;
            error?: string;
            id?: string | null;
          }
        | null = null;

      try {
        result =
          await response.json();
      } catch {
        result = {
          success: false,
          error:
            'El servidor devolvió una respuesta no válida.',
        };
      }

      // =================================================
      // ERROR
      // =================================================

      if (
        !response.ok ||
        !result?.success
      ) {
        const errorMessage =
          result?.error ||
          result?.message ||
          'No se pudo enviar la solicitud.';

        setSendingStatus('idle');

        setLoadingStepText('');

        setUploadProgress(0);

        setValidationError(
          errorMessage
        );

        setIsStatusModalOpen(false);

        return;
      }

      // =================================================
      // ÉXITO
      // =================================================

      setUploadProgress(100);

      setLoadingStepText(
        'Solicitud enviada correctamente.'
      );

      /*
       * Construimos aquí el objeto completo
       * que espera SendEmailResponse.
       *
       * El endpoint actual de send-email devuelve
       * success, message e id, por lo que completamos
       * el resto de datos en el frontend.
       */

      const completeSendResult:
        SendEmailResponse = {
        success: true,

        message:
          result.message ||
          'Solicitud enviada correctamente.',

        method:
          'resend',

        recipient:
          FIXED_RECIPIENT,

        timestamp:
          new Date().toISOString(),

        details: {
          teacherCode:
            cleanCode,

          copiesCount:
            copiesCount,

          purpose:
            purpose,

          course:
            purpose === 'alumnado'
              ? cleanCourse
              : undefined,

          group:
            purpose === 'alumnado'
              ? cleanGroup
              : undefined,

          pdfName:
            pdf.name,
        },
      };

      setSendResult(
        completeSendResult
      );

      setSendingStatus(
        'success'
      );
    } catch (error) {
      console.error(
        'Error enviando solicitud:',
        error
      );

      setSendingStatus('idle');

      setLoadingStepText('');

      setUploadProgress(0);

      setValidationError(
        error instanceof Error
          ? error.message
          : 'No se ha podido conectar con el servidor. Comprueba tu conexión a Internet e inténtalo de nuevo.'
      );

      setIsStatusModalOpen(false);
    }
  };

  // --------------------------------------------------
  // RENDER
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col antialiased selection:bg-emerald-500/20 selection:text-emerald-300">

      {/* HEADER */}

      <Header
        onReset={handleReset}
      />

      {/* CONTENIDO */}

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-6 sm:py-8">

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          {/* TARJETA PRINCIPAL */}

          <div
            id="request-form-card"
            className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5"
          >

            {/* ERROR */}

            {validationError && (
              <div
                id="form-validation-alert"
                className="p-3 rounded-xl bg-rose-950/40 border border-rose-900 text-xs text-rose-300 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />

                <p>
                  {validationError}
                </p>
              </div>
            )}

            {/* CORREO EDUCAREX */}

            <div className="space-y-2">

              <div className="flex items-center justify-between">

                <label
                  htmlFor="educarex-email-input"
                  className="text-sm sm:text-base font-semibold text-zinc-200 flex items-center gap-2"
                >
                  <Mail className="w-4 h-4 text-emerald-400" />

                  <span>
                    Tu correo Educarex
                  </span>

                  <span className="text-rose-400">
                    *
                  </span>
                </label>

                {isEmailValid ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3.5 h-3.5" />

                    Cuenta verificada
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={
                      handleAutocompleteDomain
                    }
                    className="text-xs text-emerald-400 hover:text-emerald-300 underline cursor-pointer"
                  >
                    + @educarex.es
                  </button>
                )}

              </div>

              <input
                id="educarex-email-input"
                type="email"
                required
                placeholder="tu_usuario@educarex.es"
                value={educarexEmail}
                onChange={(e) =>
                  setEducarexEmail(
                    e.target.value
                  )
                }
                className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border text-sm sm:text-base font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none transition-colors ${
                  isEmailValid
                    ? 'border-emerald-700/70 focus:border-emerald-500'
                    : 'border-zinc-800 focus:border-zinc-600'
                }`}
              />

              <p className="text-xs text-zinc-400">
                Obligatorio con la cuenta oficial{' '}
                <span className="text-zinc-300 font-medium">
                  @educarex.es
                </span>
                .
              </p>

            </div>

            {/* CÓDIGO PROFESOR */}

            <div className="space-y-2">

              <label
                htmlFor="teacher-code-input"
                className="text-sm sm:text-base font-semibold text-zinc-200 flex items-center gap-2"
              >
                <Hash className="w-4 h-4 text-emerald-400" />

                <span>
                  Código de profesor/a
                </span>

                <span className="text-rose-400">
                  *
                </span>
              </label>

              <input
                id="teacher-code-input"
                type="text"
                required
                placeholder="Ej: PROF-204"
                value={teacherCode}
                onChange={(e) =>
                  setTeacherCode(
                    e.target.value.toUpperCase()
                  )
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-sm sm:text-base font-mono tracking-wider text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
              />

            </div>

            {/* NÚMERO DE COPIAS */}

            <div className="space-y-2">

              <label
                htmlFor="copies-count-input"
                className="text-sm sm:text-base font-semibold text-zinc-200 flex items-center gap-2"
              >
                <CopyIcon className="w-4 h-4 text-emerald-400" />

                <span>
                  Número de copias
                </span>

                <span className="text-rose-400">
                  *
                </span>
              </label>

              <div className="flex items-center w-full rounded-2xl border border-zinc-800 bg-zinc-950 p-1.5 shadow-inner">

                <button
                  type="button"
                  id="copies-decrement-btn"
                  onClick={() =>
                    adjustCopies(-1)
                  }
                  className="w-14 sm:w-16 h-12 sm:h-14 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-2xl font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-zinc-800/80 hover:border-zinc-700 select-none"
                  title="Restar 1 copia"
                >
                  −
                </button>

                <input
                  id="copies-count-input"
                  type="number"
                  min={1}
                  max={1000}
                  value={copiesCount}
                  onChange={(e) =>
                    setCopiesCount(
                      Math.min(
                        1000,
                        Math.max(
                          1,
                          parseInt(
                            e.target.value
                          ) || 1
                        )
                      )
                    )
                  }
                  className="flex-1 h-12 sm:h-14 text-center font-mono text-2xl sm:text-3xl font-bold text-emerald-400 bg-transparent focus:outline-none tracking-tight"
                />

                <button
                  type="button"
                  id="copies-increment-btn"
                  onClick={() =>
                    adjustCopies(1)
                  }
                  className="w-14 sm:w-16 h-12 sm:h-14 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-2xl font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95 border border-zinc-800/80 hover:border-zinc-700 select-none"
                  title="Añadir 1 copia"
                >
                  +
                </button>

              </div>

            </div>

            {/* FINALIDAD */}

            <PurposeToggle
              value={purpose}
              onChange={setPurpose}
              course={course}
              onCourseChange={setCourse}
              group={group}
              onGroupChange={setGroup}
            />

            {/* PDF */}

            <PdfDropzone
              pdf={pdf}
              onPdfChange={setPdf}
            />

            {/* BOTÓN ENVIAR */}

            <div className="pt-2 space-y-2">

              <button
                type="submit"
                id="submit-copies-btn"
                disabled={
                  sendingStatus ===
                  'sending'
                }
                className="w-full py-3.5 px-5 rounded-xl font-bold text-sm sm:text-base bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-50"
              >

                {sendingStatus ===
                'sending' ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />

                    <span>
                      Enviando a conserjería...
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />

                    <span>
                      Enviar a conserjería
                    </span>
                  </>
                )}

              </button>

              <div className="flex items-center justify-center gap-1.5 text-center text-xs text-zinc-400">

                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />

                <span>
                  Destino directo y fijo:{' '}
                  {FIXED_RECIPIENT}
                </span>

              </div>

            </div>

          </div>

        </form>

      </main>

      {/* MODAL DE ENVÍO */}

      <SendingStatusModal
        isOpen={
          isStatusModalOpen
        }
        status={
          sendingStatus
        }
        onClose={() => {
          setIsStatusModalOpen(
            false
          );

          setSendingStatus(
            'idle'
          );

          setLoadingStepText(
            ''
          );

          setUploadProgress(
            0
          );
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

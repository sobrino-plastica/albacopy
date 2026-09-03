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

import Header from './components/Header';
import PurposeToggle from './components/PurposeToggle';
import PdfDropzone from './components/PdfDropzone';
import SendingStatusModal from './components/SendingStatusModal';

import type {
  AttachedPdf,
  CopyPurpose,
  EducarexUser,
  SendEmailResponse,
} from './types';

const FIXED_RECIPIENT = 'conserjeria.ies.albalat@educarex.es';
const MAX_PDF_SIZE = 25 * 1024 * 1024;

const STORAGE_EMAIL = 'albacopy_educarex_email';
const STORAGE_TEACHER_CODE = 'albacopy_teacher_code';
const STORAGE_COURSE = 'albacopy_course';
const STORAGE_GROUP = 'albacopy_group';

export default function App() {
  const [educarexEmail, setEducarexEmail] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [copiesCount, setCopiesCount] = useState(25);
  const [purpose, setPurpose] = useState<CopyPurpose>('alumnado');
  const [course, setCourse] = useState('');
  const [group, setGroup] = useState('');
  const [pdf, setPdf] = useState<AttachedPdf | null>(null);

  const [validationError, setValidationError] = useState('');
  const [sendingStatus, setSendingStatus] = useState<
    'idle' | 'sending' | 'success'
  >('idle');

  const [loadingStepText, setLoadingStepText] = useState(
    'Preparando la solicitud...'
  );

  const [uploadProgress, setUploadProgress] = useState(0);

  const [sendResult, setSendResult] =
    useState<SendEmailResponse | null>(null);

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  useEffect(() => {
    const savedEmail = localStorage.getItem(STORAGE_EMAIL);
    const savedTeacherCode = localStorage.getItem(STORAGE_TEACHER_CODE);
    const savedCourse = localStorage.getItem(STORAGE_COURSE);
    const savedGroup = localStorage.getItem(STORAGE_GROUP);

    if (savedEmail) setEducarexEmail(savedEmail);
    if (savedTeacherCode) setTeacherCode(savedTeacherCode);
    if (savedCourse) setCourse(savedCourse);
    if (savedGroup) setGroup(savedGroup);
  }, []);

  useEffect(() => {
    if (educarexEmail.trim()) {
      localStorage.setItem(
        STORAGE_EMAIL,
        educarexEmail.trim()
      );
    }
  }, [educarexEmail]);

  useEffect(() => {
    if (teacherCode.trim()) {
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

  const cleanEmail = educarexEmail.trim().toLowerCase();
  const cleanCode = teacherCode.trim().toUpperCase();
  const cleanCourse = course.trim();
  const cleanGroup = group.trim();

  const purposeText =
    purpose === 'alumnado'
      ? 'Copias para alumnado'
      : 'Uso personal';

  const emailSubject = `[COPIAS IES ALBALAT] Prof. ${
    cleanCode || 'XXX'
  } - ${copiesCount} copias`;

  const emailBody = [
    'Solicitud de fotocopias · IES Albalat',
    '',
    `Correo Educarex: ${cleanEmail || 'N/A'}`,
    `Código de profesor/a: ${cleanCode || 'N/A'}`,
    `Número de copias: ${copiesCount}`,
    `Fin de las copias: ${purposeText}`,
    ...(purpose === 'alumnado'
      ? [
          `Curso: ${cleanCourse || 'N/A'}`,
          `Grupo: ${cleanGroup || 'N/A'}`,
        ]
      : []),
    `Archivo PDF: ${pdf?.name || 'Sin adjunto'}`,
  ].join('\n');

  const isEmailValid = (email: string) =>
    /^[^\s@]+@educarex\.es$/i.test(email.trim());

  const adjustCopies = (amount: number) => {
    setCopiesCount((current) => {
      const next = current + amount;
      return Math.min(1000, Math.max(1, next));
    });
  };

  const resetForm = () => {
    setCopiesCount(25);
    setPurpose('alumnado');
    setCourse('');
    setGroup('');
    setPdf(null);
    setValidationError('');
    setSendResult(null);
    setSendingStatus('idle');
    setUploadProgress(0);
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setValidationError('');

    if (!isEmailValid(cleanEmail)) {
      setValidationError(
        'Introduce un correo Educarex válido (@educarex.es).'
      );
      return;
    }

    if (!cleanCode) {
      setValidationError(
        'Introduce el código de profesor/a.'
      );
      return;
    }

    if (
      !Number.isInteger(copiesCount) ||
      copiesCount < 1 ||
      copiesCount > 1000
    ) {
      setValidationError(
        'El número de copias debe estar entre 1 y 1000.'
      );
      return;
    }

    if (purpose === 'alumnado') {
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

    if (!pdf) {
      setValidationError(
        'Adjunta el archivo PDF que quieres enviar.'
      );
      return;
    }

    if (pdf.size > MAX_PDF_SIZE) {
      setValidationError(
        'El PDF no puede superar los 25 MB.'
      );
      return;
    }

    if (
      !pdf.name.toLowerCase().endsWith('.pdf')
    ) {
      setValidationError(
        'El archivo adjunto debe ser un PDF.'
      );
      return;
    }

    setSendResult(null);
    setSendingStatus('sending');
    setIsStatusModalOpen(true);
    setUploadProgress(0);
    setLoadingStepText('Preparando el PDF...');

    try {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.open('POST', '/api/send-email');

        xhr.setRequestHeader(
          'Content-Type',
          'application/pdf'
        );

        xhr.setRequestHeader(
          'X-Educarex-Email',
          encodeURIComponent(cleanEmail)
        );

        xhr.setRequestHeader(
          'X-Teacher-Code',
          encodeURIComponent(cleanCode)
        );

        xhr.setRequestHeader(
          'X-Copies-Count',
          encodeURIComponent(String(copiesCount))
        );

        xhr.setRequestHeader(
          'X-Purpose',
          encodeURIComponent(purpose)
        );

        xhr.setRequestHeader(
          'X-Course',
          encodeURIComponent(cleanCourse)
        );

        xhr.setRequestHeader(
          'X-Group',
          encodeURIComponent(cleanGroup)
        );

        xhr.setRequestHeader(
          'X-PDF-Filename',
          encodeURIComponent(pdf.name)
        );

        xhr.upload.onprogress = (progressEvent) => {
          if (progressEvent.lengthComputable) {
            const progress = Math.round(
              (progressEvent.loaded /
                progressEvent.total) *
                100
            );

            setUploadProgress(progress);

            if (progress < 100) {
              setLoadingStepText(
                `Subiendo PDF... ${progress}%`
              );
            } else {
              setLoadingStepText(
                'PDF recibido. Enviando correo...'
              );
            }
          }
        };

        xhr.onload = () => {
          let data: SendEmailResponse | null = null;

          try {
            data = xhr.responseText
              ? JSON.parse(xhr.responseText)
              : null;
          } catch {
            data = null;
          }

          if (
            xhr.status < 200 ||
            xhr.status >= 300 ||
            !data?.success
          ) {
            reject(
              new Error(
                data?.error ||
                  `Error del servidor (${xhr.status}).`
              )
            );
            return;
          }

          setUploadProgress(100);
          setLoadingStepText(
            'Correo enviado correctamente.'
          );

          setSendResult(data);
          setSendingStatus('success');

          resolve();
        };

        xhr.onerror = () => {
          reject(
            new Error(
              'No se pudo conectar con el servidor.'
            )
          );
        };

        xhr.ontimeout = () => {
          reject(
            new Error(
              'La solicitud ha tardado demasiado tiempo.'
            )
          );
        };

        xhr.timeout = 60000;

        xhr.send(pdf.file);
      });
    } catch (error) {
      console.error('Error enviando solicitud:', error);

      setSendingStatus('idle');
      setIsStatusModalOpen(false);
      setUploadProgress(0);

      setValidationError(
        error instanceof Error
          ? error.message
          : 'No se pudo enviar la solicitud.'
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <CopyIcon size={21} />
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Solicitud de fotocopias
              </h1>
              <p className="text-sm text-slate-500">
                IES Albalat
              </p>
            </div>
          </div>

          <p className="max-w-2xl text-sm leading-6 text-slate-600">
            Completa los datos de la solicitud y adjunta el
            documento PDF. La petición será enviada
            directamente a conserjería.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Mail size={18} />
              </div>

              <div>
                <h2 className="font-semibold text-slate-900">
                  Datos del profesor/a
                </h2>
                <p className="text-xs text-slate-500">
                  Utiliza tu cuenta institucional de Educarex.
                </p>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label
                  htmlFor="educarexEmail"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Correo Educarex
                </label>

                <input
                  id="educarexEmail"
                  type="email"
                  value={educarexEmail}
                  onChange={(event) =>
                    setEducarexEmail(event.target.value)
                  }
                  placeholder="nombre@educarex.es"
                  autoComplete="email"
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="teacherCode"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Código de profesor/a
                </label>

                <div className="relative">
                  <Hash
                    size={17}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="teacherCode"
                    type="text"
                    value={teacherCode}
                    onChange={(event) =>
                      setTeacherCode(
                        event.target.value.toUpperCase()
                      )
                    }
                    placeholder="PR-01"
                    className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm uppercase outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="font-semibold text-slate-900">
                Número de copias
              </h2>
              <p className="text-xs text-slate-500">
                Indica cuántas copias necesitas.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => adjustCopies(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-xl font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                disabled={copiesCount <= 1}
                aria-label="Reducir número de copias"
              >
                −
              </button>

              <input
                type="number"
                min={1}
                max={1000}
                value={copiesCount}
                onChange={(event) => {
                  const value = Number(event.target.value);

                  if (!Number.isNaN(value)) {
                    setCopiesCount(
                      Math.min(
                        1000,
                        Math.max(1, Math.floor(value))
                      )
                    );
                  }
                }}
                className="h-11 w-28 rounded-xl border border-slate-300 text-center text-lg font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() => adjustCopies(1)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-xl font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                disabled={copiesCount >= 1000}
                aria-label="Aumentar número de copias"
              >
                +
              </button>

              <span className="ml-1 text-sm text-slate-500">
                copias
              </span>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="font-semibold text-slate-900">
                Finalidad de las copias
              </h2>
              <p className="text-xs text-slate-500">
                Selecciona para quién son las copias.
              </p>
            </div>

            <PurposeToggle
              value={purpose}
              onChange={setPurpose}
            />

            {purpose === 'alumnado' && (
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <div>
                  <label
                    htmlFor="course"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Curso
                  </label>

                  <input
                    id="course"
                    type="text"
                    value={course}
                    onChange={(event) =>
                      setCourse(event.target.value)
                    }
                    placeholder="Ej. 2º ESO"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="group"
                    className="mb-2 block text-sm font-medium text-slate-700"
                  >
                    Grupo
                  </label>

                  <input
                    id="group"
                    type="text"
                    value={group}
                    onChange={(event) =>
                      setGroup(event.target.value)
                    }
                    placeholder="Ej. A"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <h2 className="font-semibold text-slate-900">
                Documento
              </h2>
              <p className="text-xs text-slate-500">
                Adjunta el PDF que debe imprimirse.
              </p>
            </div>

            <PdfDropzone
              pdf={pdf}
              onPdfChange={setPdf}
            />
          </section>

          {validationError && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle
                size={19}
                className="mt-0.5 shrink-0"
              />

              <div>
                <p className="font-medium">
                  No se puede enviar la solicitud
                </p>
                <p className="mt-1">
                  {validationError}
                </p>
              </div>
            </div>
          )}

          <section className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={20}
                className="mt-0.5 shrink-0 text-blue-600"
              />

              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Envío seguro
                </p>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  El documento se envía directamente al sistema
                  de correo configurado para la conserjería del
                  IES Albalat.
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  Destinatario: {FIXED_RECIPIENT}
                </p>
              </div>
            </div>
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Limpiar
            </button>

            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-200"
            >
              <Send size={17} />
              Enviar solicitud
            </button>
          </div>
        </form>

        {sendResult && sendingStatus === 'success' && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4">
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0 text-green-600"
            />

            <div>
              <p className="text-sm font-semibold text-green-900">
                Solicitud enviada correctamente
              </p>

              <p className="mt-1 text-sm text-green-800">
                La petición ha sido enviada a conserjería.
              </p>
            </div>
          </div>
        )}
      </main>

      <SendingStatusModal
        isOpen={isStatusModalOpen}
        status={sendingStatus}
        onClose={() => {
          if (sendingStatus !== 'sending') {
            setIsStatusModalOpen(false);
          }
        }}
        result={sendResult}
        emailSubject={emailSubject}
        emailBody={emailBody}
        pdfName={pdf?.name}
        loadingStepText={loadingStepText}
        uploadProgress={uploadProgress}
      />
    </div>
  );
}

import React, {
  ChangeEvent,
  FormEvent,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  FileText,
  Loader2,
  LogIn,
  Mail,
  Printer,
  Send,
  Upload,
  User,
  X,
} from 'lucide-react';

import type {
  AttachedPdf,
  CopyFormData,
  EducarexUser,
  PrintOptionsData,
  SendEmailResponse,
} from './types';

const MAX_PDF_SIZE =
  25 * 1024 * 1024;

const INITIAL_PRINT_OPTIONS: PrintOptionsData = {
  doubleSided: false,
  paperSize: 'A4',
  colorMode: 'bn',
  stapled: false,
  urgency: 'normal',
  notes: '',
};

const INITIAL_FORM: CopyFormData = {
  teacherCode: '',
  teacherName: '',
  copiesCount: 1,
  purpose: 'alumnado',
  options: INITIAL_PRINT_OPTIONS,
  pdf: null,
};

const COURSES = [
  '1º ESO',
  '2º ESO',
  '3º ESO',
  '4º ESO',
  '1º Bachillerato',
  '2º Bachillerato',
];

const GROUPS = [
  'A',
  'B',
  'C',
  'D',
  'E',
];

interface UploadPdfResponse {
  success: boolean;
  uploadUrl?: string;
  downloadUrl?: string;
  pathname?: string;
  error?: string;
}

function App() {
  const [user, setUser] =
    useState<EducarexUser | null>(null);

  const [loginEmail, setLoginEmail] =
    useState('');

  const [loginName, setLoginName] =
    useState('');

  const [loginTeacherCode, setLoginTeacherCode] =
    useState('');

  const [form, setForm] =
    useState<CopyFormData>(
      INITIAL_FORM
    );

  const [course, setCourse] =
    useState('');

  const [group, setGroup] =
    useState('');

  const [isLoggingIn, setIsLoggingIn] =
    useState(false);

  const [isSending, setIsSending] =
    useState(false);

  const [status, setStatus] =
    useState<{
      type: 'success' | 'error';
      message: string;
    } | null>(null);

  const [pdfError, setPdfError] =
    useState('');

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const canSubmit =
    !isSending &&
    form.teacherCode.trim().length > 0 &&
    form.teacherName.trim().length > 0 &&
    form.copiesCount >= 1 &&
    !!form.pdf;

  const handleLogin = (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const email =
      loginEmail.trim();

    const name =
      loginName.trim();

    const teacherCode =
      loginTeacherCode.trim();

    if (
      !email ||
      !name ||
      !teacherCode
    ) {
      setStatus({
        type: 'error',
        message:
          'Completa el correo, el nombre y el código de profesor.',
      });

      return;
    }

    setIsLoggingIn(true);
    setStatus(null);

    const loggedUser: EducarexUser = {
      email,
      name,
      teacherCode,
      loggedAt:
        new Date().toISOString(),
    };

    setTimeout(() => {
      setUser(loggedUser);

      setForm(
        previous => ({
          ...previous,
          teacherCode,
          teacherName: name,
        })
      );

      setIsLoggingIn(false);
    }, 400);
  };

  const handleLogout = () => {
    setUser(null);
    setStatus(null);

    setForm({
      ...INITIAL_FORM,
      options: {
        ...INITIAL_PRINT_OPTIONS,
      },
    });

    setCourse('');
    setGroup('');
  };

  const updateForm = <
    K extends keyof CopyFormData
  >(
    field: K,
    value: CopyFormData[K]
  ) => {
    setForm(
      previous => ({
        ...previous,
        [field]: value,
      })
    );
  };

  const updatePrintOption = <
    K extends keyof PrintOptionsData
  >(
    field: K,
    value: PrintOptionsData[K]
  ) => {
    setForm(
      previous => ({
        ...previous,
        options: {
          ...previous.options,
          [field]: value,
        },
      })
    );
  };

  const handlePdfChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    setPdfError('');
    setStatus(null);

    if (!file) {
      return;
    }

    if (
      file.type !==
        'application/pdf' &&
      !file.name
        .toLowerCase()
        .endsWith('.pdf')
    ) {
      setPdfError(
        'Solo se pueden adjuntar archivos PDF.'
      );

      event.target.value = '';

      return;
    }

    if (
      file.size >
      MAX_PDF_SIZE
    ) {
      setPdfError(
        'El PDF no puede superar los 25 MB.'
      );

      event.target.value = '';

      return;
    }

    const attachedPdf: AttachedPdf =
      {
        name: file.name,
        size: file.size,
        type:
          file.type ||
          'application/pdf',
        file,
        lastModified:
          file.lastModified,
      };

    updateForm(
      'pdf',
      attachedPdf
    );
  };

  const removePdf = () => {
    updateForm(
      'pdf',
      null
    );

    setPdfError('');

    if (
      fileInputRef.current
    ) {
      fileInputRef.current.value =
        '';
    }
  };

  const formatFileSize = (
    bytes: number
  ) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (
      bytes <
      1024 * 1024
    ) {
      return `${(
        bytes / 1024
      ).toFixed(1)} KB`;
    }

    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(2)} MB`;
  };

  const uploadPdf = async (
    pdf: AttachedPdf
  ) => {
    /*
     * =====================================================
     * PASO 1
     * Pedimos a Vercel una URL firmada de subida y otra
     * URL firmada de descarga.
     * =====================================================
     */

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
                pdf.name,
            },
          }),
        }
      );

    let prepareData:
      | UploadPdfResponse
      | null =
      null;

    try {
      prepareData =
        (await prepareResponse.json()) as UploadPdfResponse;
    } catch {
      prepareData = null;
    }

    if (
      !prepareResponse.ok ||
      !prepareData?.success ||
      !prepareData.uploadUrl ||
      !prepareData.downloadUrl
    ) {
      throw new Error(
        prepareData?.error ||
          'No se pudo preparar la subida del PDF.'
      );
    }

    /*
     * =====================================================
     * PASO 2
     * Subimos el archivo directamente a Vercel Blob
     * utilizando la URL firmada.
     * =====================================================
     */

    const uploadResponse =
      await fetch(
        prepareData.uploadUrl,
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
      !uploadResponse.ok
    ) {
      let uploadError =
        '';

      try {
        uploadError =
          await uploadResponse.text();
      } catch {
        uploadError =
          '';
      }

      console.error(
        'Error al subir PDF a Vercel Blob:',
        uploadError
      );

      throw new Error(
        `No se pudo subir el PDF a Vercel Blob. HTTP ${uploadResponse.status}.`
      );
    }

    /*
     * Devolvemos la URL firmada de descarga.
     * send-email.ts la utilizará para descargar
     * el PDF privado.
     */

    return {
      downloadUrl:
        prepareData.downloadUrl,

      pathname:
        prepareData.pathname ||
        '',
    };
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setStatus(null);

    if (!user) {
      setStatus({
        type: 'error',
        message:
          'No hay una sesión de profesor activa.',
      });

      return;
    }

    if (
      !form.teacherCode.trim()
    ) {
      setStatus({
        type: 'error',
        message:
          'Introduce el código del profesor.',
      });

      return;
    }

    if (
      !form.teacherName.trim()
    ) {
      setStatus({
        type: 'error',
        message:
          'Introduce el nombre del profesor.',
      });

      return;
    }

    if (
      !user.email.trim()
    ) {
      setStatus({
        type: 'error',
        message:
          'No se ha encontrado el correo Educarex.',
      });

      return;
    }

    if (
      form.copiesCount < 1
    ) {
      setStatus({
        type: 'error',
        message:
          'El número de copias debe ser como mínimo 1.',
      });

      return;
    }

    if (!form.pdf) {
      setStatus({
        type: 'error',
        message:
          'Debes adjuntar un PDF.',
      });

      return;
    }

    if (
      form.pdf.size >
      MAX_PDF_SIZE
    ) {
      setStatus({
        type: 'error',
        message:
          'El PDF no puede superar los 25 MB.',
      });

      return;
    }

    setIsSending(true);

    try {
      /*
       * =====================================================
       * PASO 1:
       * Subir PDF a Vercel Blob.
       * =====================================================
       */

      const {
        downloadUrl,
      } =
        await uploadPdf(
          form.pdf
        );

      /*
       * =====================================================
       * PASO 2:
       * Enviar los datos de la solicitud al backend.
       *
       * IMPORTANTE:
       * send-email.ts espera JSON, no FormData.
       * =====================================================
       */

      const sendResponse =
        await fetch(
          '/api/send-email',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                educarexEmail:
                  user.email.trim(),

                teacherCode:
                  form.teacherCode
                    .trim()
                    .toUpperCase(),

                copiesCount:
                  form.copiesCount,

                purpose:
                  form.purpose,

                course:
                  course.trim(),

                group:
                  group.trim(),

                fileName:
                  form.pdf.name,

                downloadUrl,
              }),
          }
        );

      let sendData:
        | SendEmailResponse
        | null =
        null;

      try {
        sendData =
          (await sendResponse.json()) as SendEmailResponse;
      } catch {
        sendData = null;
      }

      if (
        !sendResponse.ok ||
        !sendData?.success
      ) {
        throw new Error(
          sendData?.error ||
            sendData?.message ||
            'No se pudo enviar la solicitud.'
        );
      }

      /*
       * =====================================================
       * ÉXITO
       * =====================================================
       */

      setStatus({
        type: 'success',
        message:
          sendData.message ||
          'Solicitud enviada correctamente.',
      });

      setForm({
        teacherCode:
          form.teacherCode,

        teacherName:
          form.teacherName,

        copiesCount:
          1,

        purpose:
          form.purpose,

        options: {
          ...INITIAL_PRINT_OPTIONS,
        },

        pdf:
          null,
      });

      setCourse('');
      setGroup('');

      if (
        fileInputRef.current
      ) {
        fileInputRef.current.value =
          '';
      }
    } catch (error) {
      console.error(
        'Error enviando solicitud:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Ha ocurrido un error al enviar la solicitud.';

      setStatus({
        type: 'error',
        message,
      });
    } finally {
      setIsSending(false);
    }
  };

  /*
   * =========================================================
   * PANTALLA DE ACCESO
   * =========================================================
   */

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 px-8 py-8 text-white">
              <div className="w-14 h-14 rounded-xl bg-white/10 flex items-center justify-center mb-5">
                <Printer size={30} />
              </div>

              <h1 className="text-2xl font-bold">
                Solicitud de fotocopias
              </h1>

              <p className="text-slate-300 mt-2 text-sm">
                Servicio de reprografía del centro
              </p>
            </div>

            <form
              onSubmit={
                handleLogin
              }
              className="p-8 space-y-5"
            >
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Correo electrónico
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="login-email"
                    type="email"
                    value={
                      loginEmail
                    }
                    onChange={event =>
                      setLoginEmail(
                        event.target
                          .value
                      )
                    }
                    placeholder="nombre@educarex.es"
                    className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-3 outline-none focus:ring-2 focus:ring-slate-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-name"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Nombre del profesor
                </label>

                <div className="relative">
                  <User
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="login-name"
                    type="text"
                    value={
                      loginName
                    }
                    onChange={event =>
                      setLoginName(
                        event.target
                          .value
                      )
                    }
                    placeholder="Nombre y apellidos"
                    className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-3 outline-none focus:ring-2 focus:ring-slate-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-code"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Código de profesor
                </label>

                <div className="relative">
                  <ClipboardList
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="login-code"
                    type="text"
                    value={
                      loginTeacherCode
                    }
                    onChange={event =>
                      setLoginTeacherCode(
                        event.target
                          .value
                      )
                    }
                    placeholder="Ej.: PR-01"
                    className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-3 outline-none focus:ring-2 focus:ring-slate-400"
                    required
                  />
                </div>
              </div>

              {status && (
                <div
                  className={`rounded-lg p-3 text-sm flex items-start gap-2 ${
                    status.type ===
                    'error'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : 'bg-green-50 text-green-700 border border-green-200'
                  }`}
                >
                  {status.type ===
                  'error' ? (
                    <AlertCircle
                      size={18}
                      className="shrink-0 mt-0.5"
                    />
                  ) : (
                    <CheckCircle2
                      size={18}
                      className="shrink-0 mt-0.5"
                    />
                  )}

                  <span>
                    {
                      status.message
                    }
                  </span>
                </div>
              )}

              <button
                type="submit"
                disabled={
                  isLoggingIn
                }
                className="w-full rounded-lg bg-slate-900 text-white py-3.5 font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {isLoggingIn ? (
                  <>
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />

                    Accediendo...
                  </>
                ) : (
                  <>
                    <LogIn
                      size={18}
                    />

                    Acceder
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /*
   * =========================================================
   * APLICACIÓN PRINCIPAL
   * =========================================================
   */

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Printer
                size={22}
              />
            </div>

            <div>
              <h1 className="font-bold">
                Solicitud de fotocopias
              </h1>

              <p className="text-xs text-slate-300">
                Servicio de reprografía
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <div className="text-sm font-semibold">
                {
                  form.teacherName
                }
              </div>

              <div className="text-xs text-slate-300">
                {
                  form.teacherCode
                }
              </div>
            </div>

            <button
              type="button"
              onClick={
                handleLogout
              }
              className="text-xs border border-slate-600 rounded-lg px-3 py-2 hover:bg-slate-800 transition"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6"
        >
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <User
                  size={20}
                  className="text-slate-700"
                />
              </div>

              <div>
                <h2 className="font-bold text-lg text-slate-900">
                  Datos del profesor
                </h2>

                <p className="text-sm text-slate-500">
                  Estos datos aparecerán en la solicitud.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label
                  htmlFor="teacher-code"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Código de profesor
                </label>

                <input
                  id="teacher-code"
                  type="text"
                  value={
                    form.teacherCode
                  }
                  onChange={event =>
                    updateForm(
                      'teacherCode',
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:ring-2 focus:ring-slate-400"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="teacher-name"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Nombre del profesor
                </label>

                <input
                  id="teacher-name"
                  type="text"
                  value={
                    form.teacherName
                  }
                  onChange={event =>
                    updateForm(
                      'teacherName',
                      event.target
                        .value
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:ring-2 focus:ring-slate-400"
                  required
                />
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <ClipboardList
                  size={20}
                  className="text-slate-700"
                />
              </div>

              <div>
                <h2 className="font-bold text-lg text-slate-900">
                  Datos de la solicitud
                </h2>

                <p className="text-sm text-slate-500">
                  Indica qué necesitas imprimir.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-5">
              <div>
                <label
                  htmlFor="copies"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Número de copias
                </label>

                <input
                  id="copies"
                  type="number"
                  min={1}
                  max={1000}
                  value={
                    form.copiesCount
                  }
                  onChange={event => {
                    const value =
                      Number(
                        event.target
                          .value
                      );

                    updateForm(
                      'copiesCount',
                      Number.isFinite(
                        value
                      ) &&
                        value >
                          0
                        ? value
                        : 1
                    );
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none focus:ring-2 focus:ring-slate-400"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="course"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Curso
                </label>

                <div className="relative">
                  <select
                    id="course"
                    value={
                      course
                    }
                    onChange={event =>
                      setCourse(
                        event.target
                          .value
                      )
                    }
                    className="appearance-none w-full rounded-lg border border-slate-300 px-3 py-3 pr-10 bg-white outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="">
                      Seleccionar curso
                    </option>

                    {COURSES.map(
                      item => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="group"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Grupo
                </label>

                <div className="relative">
                  <select
                    id="group"
                    value={
                      group
                    }
                    onChange={event =>
                      setGroup(
                        event.target
                          .value
                      )
                    }
                    className="appearance-none w-full rounded-lg border border-slate-300 px-3 py-3 pr-10 bg-white outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="">
                      Seleccionar grupo
                    </option>

                    {GROUPS.map(
                      item => (
                        <option
                          key={item}
                          value={item}
                        >
                          {item}
                        </option>
                      )
                    )}
                  </select>

                  <ChevronDown
                    size={18}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Finalidad
              </label>

              <div className="grid sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() =>
                    updateForm(
                      'purpose',
                      'alumnado'
                    )
                  }
                  className={`rounded-xl border p-4 text-left transition ${
                    form.purpose ===
                    'alumnado'
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div className="font-semibold text-slate-900">
                    Alumnado
                  </div>

                  <div className="text-sm text-slate-500 mt-1">
                    Material destinado al alumnado.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    updateForm(
                      'purpose',
                      'personal'
                    )
                  }
                  className={`rounded-xl border p-4 text-left transition ${
                    form.purpose ===
                    'personal'
                      ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                      : 'border-slate-300 hover:border-slate-400'
                  }`}
                >
                  <div className="font-semibold text-slate-900">
                    Personal
                  </div>

                  <div className="text-sm text-slate-500 mt-1">
                    Material de uso personal del profesor.
                  </div>
                </button>
              </div>
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Printer
                  size={20}
                  className="text-slate-700"
                />
              </div>

              <div>
                <h2 className="font-bold text-lg text-slate-900">
                  Opciones de impresión
                </h2>

                <p className="text-sm text-slate-500">
                  Selecciona las características de las copias.
                </p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div>
                <label
                  htmlFor="paper-size"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Tamaño
                </label>

                <select
                  id="paper-size"
                  value={
                    form.options
                      .paperSize
                  }
                  onChange={event =>
                    updatePrintOption(
                      'paperSize',
                      event.target
                        .value as
                        | 'A4'
                        | 'A3'
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 bg-white outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="A4">
                    A4
                  </option>

                  <option value="A3">
                    A3
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="color-mode"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Color
                </label>

                <select
                  id="color-mode"
                  value={
                    form.options
                      .colorMode
                  }
                  onChange={event =>
                    updatePrintOption(
                      'colorMode',
                      event.target
                        .value as
                        | 'bn'
                        | 'color'
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 bg-white outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="bn">
                    Blanco y negro
                  </option>

                  <option value="color">
                    Color
                  </option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="urgency"
                  className="block text-sm font-semibold text-slate-700 mb-2"
                >
                  Urgencia
                </label>

                <select
                  id="urgency"
                  value={
                    form.options
                      .urgency
                  }
                  onChange={event =>
                    updatePrintOption(
                      'urgency',
                      event.target
                        .value as
                        | 'normal'
                        | 'urgente'
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-3 bg-white outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="normal">
                    Normal
                  </option>

                  <option value="urgente">
                    Urgente
                  </option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-6">
              <label className="flex items-center gap-3 border border-slate-300 rounded-xl p-4 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={
                    form.options
                      .doubleSided
                  }
                  onChange={event =>
                    updatePrintOption(
                      'doubleSided',
                      event.target
                        .checked
                    )
                  }
                  className="w-5 h-5"
                />

                <div>
                  <div className="font-semibold text-slate-900">
                    Doble cara
                  </div>

                  <div className="text-sm text-slate-500">
                    Imprimir por ambas caras.
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 border border-slate-300 rounded-xl p-4 cursor-pointer hover:bg-slate-50">
                <input
                  type="checkbox"
                  checked={
                    form.options
                      .stapled
                  }
                  onChange={event =>
                    updatePrintOption(
                      'stapled',
                      event.target
                        .checked
                    )
                  }
                  className="w-5 h-5"
                />

                <div>
                  <div className="font-semibold text-slate-900">
                    Grapado
                  </div>

                  <div className="text-sm text-slate-500">
                    Solicitar las copias grapadas.
                  </div>
                </div>
              </label>
            </div>

            <div className="mt-6">
              <label
                htmlFor="notes"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Observaciones
              </label>

              <textarea
                id="notes"
                value={
                  form.options
                    .notes
                }
                onChange={event =>
                  updatePrintOption(
                    'notes',
                    event.target
                      .value
                  )
                }
                rows={4}
                placeholder="Indica cualquier instrucción adicional..."
                className="w-full rounded-lg border border-slate-300 px-3 py-3 outline-none resize-y focus:ring-2 focus:ring-slate-400"
              />
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <FileText
                  size={20}
                  className="text-slate-700"
                />
              </div>

              <div>
                <h2 className="font-bold text-lg text-slate-900">
                  Documento PDF
                </h2>

                <p className="text-sm text-slate-500">
                  Adjunta el archivo que quieres imprimir.
                </p>
              </div>
            </div>

            {!form.pdf ? (
              <label
                htmlFor="pdf-upload"
                className="border-2 border-dashed border-slate-300 rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:border-slate-500 hover:bg-slate-50 transition"
              >
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <Upload
                    size={25}
                    className="text-slate-600"
                  />
                </div>

                <div className="font-semibold text-slate-900">
                  Selecciona un PDF
                </div>

                <div className="text-sm text-slate-500 mt-1">
                  Tamaño máximo: 25 MB
                </div>

                <input
                  ref={
                    fileInputRef
                  }
                  id="pdf-upload"
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={
                    handlePdfChange
                  }
                  className="hidden"
                />
              </label>
            ) : (
              <div className="border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                  <FileText
                    size={24}
                    className="text-red-600"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900 truncate">
                    {
                      form.pdf
                        .name
                    }
                  </div>

                  <div className="text-sm text-slate-500">
                    {
                      formatFileSize(
                        form.pdf
                          .size
                      )
                    }
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    removePdf
                  }
                  className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-100 transition"
                  aria-label="Eliminar PDF"
                >
                  <X
                    size={18}
                  />
                </button>
              </div>
            )}

            {pdfError && (
              <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                <AlertCircle
                  size={17}
                />

                {
                  pdfError
                }
              </div>
            )}
          </section>

          {status && (
            <div
              className={`rounded-xl border p-4 flex items-start gap-3 ${
                status.type ===
                'success'
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}
            >
              {status.type ===
              'success' ? (
                <CheckCircle2
                  size={22}
                  className="shrink-0"
                />
              ) : (
                <AlertCircle
                  size={22}
                  className="shrink-0"
                />
              )}

              <div className="text-sm font-medium">
                {
                  status.message
                }
              </div>
            </div>
          )}

          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-7">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="font-bold text-slate-900">
                  Enviar solicitud
                </div>

                <div className="text-sm text-slate-500 mt-1">
                  La solicitud será enviada a conserjería.
                </div>
              </div>

              <button
                type="submit"
                disabled={
                  !canSubmit
                }
                className="w-full sm:w-auto min-w-[190px] rounded-xl bg-slate-900 text-white px-6 py-3.5 font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {isSending ? (
                  <>
                    <Loader2
                      size={19}
                      className="animate-spin"
                    />

                    Enviando...
                  </>
                ) : (
                  <>
                    <Send
                      size={19}
                    />

                    Enviar solicitud
                  </>
                )}
              </button>
            </div>
          </section>
        </form>
      </main>
    </div>
  );
}

export default App;

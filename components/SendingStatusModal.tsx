import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Mail, ExternalLink, Copy, Download, X, FileText, Send, Sparkles, School } from 'lucide-react';
import { SendEmailResponse } from '../types';

interface SendingStatusModalProps {
  isOpen: boolean;
  status: 'idle' | 'sending' | 'success';
  onClose: () => void;
  result: SendEmailResponse | null;
  emailSubject: string;
  emailBody: string;
  pdfName?: string;
  loadingStepText: string;
  uploadProgress: number;
}

export const SendingStatusModal: React.FC<SendingStatusModalProps> = ({
  isOpen,
  status,
  onClose,
  result,
  emailSubject,
  emailBody,
  pdfName,
  loadingStepText,
  uploadProgress,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!result) return;
    const fullText = `Destinatario: ${result.recipient}\nAsunto: ${emailSubject}\n\n${emailBody}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInGmail = () => {
    if (!result) return;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      result.recipient
    )}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(gmailUrl, '_blank');
  };

  const openInMailto = () => {
    if (!result) return;
    const mailtoUrl = `mailto:${encodeURIComponent(result.recipient)}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoUrl;
  };

  const downloadReceipt = () => {
    if (!result) return;
    const receiptContent = `========================================================\n` +
      `COMPROBANTE DE SOLICITUD DE FOTOCOPIAS - IES ALBALAT\n` +
      `========================================================\n` +
      `Fecha y hora: ${result.timestamp}\n` +
      `Destinatario fijo: ${result.recipient}\n` +
      `Estado: mensaje enviado\n\n` +
      `DETALLES DE LA PETICIÓN:\n` +
      `- Código Profesor: ${result.details?.teacherCode || 'N/A'}\n` +
      `- Número de copias: ${result.details?.copiesCount || 'N/A'}\n` +
      `- Fin de las copias: ${result.details?.purpose || 'N/A'}\n` +
      `- Archivo PDF: ${pdfName || 'Sin adjunto'}\n\n` +
      `MENSAJE ENVIADO:\n` +
      `Asunto: ${emailSubject}\n\n` +
      `${emailBody}\n` +
      `========================================================\n`;

    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'comprobante-copias-ies-albalat.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="sending-status-modal-overlay"
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={status === 'success' ? onClose : undefined}
    >
      <div
        id="sending-status-modal-card"
        className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative space-y-6 my-8 text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          {status === 'sending' ? (
            /* ANIMATION OF LOADING WHILE SENDING */
            <motion.div
              key="sending-state"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-6 text-center space-y-6"
            >
              {/* Animated Glowing Ring and Pulsing Icon */}
              <div className="relative w-24 h-24 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20" />
                <motion.div
                  className="absolute inset-0 rounded-full border-4 border-emerald-400 border-t-transparent"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                />
                <motion.div
                  className="w-14 h-14 rounded-full bg-emerald-950/80 border border-emerald-700/80 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
                >
                  <Send className="w-6 h-6 ml-0.5 text-emerald-300" />
                </motion.div>
              </div>

              <div className="space-y-2 max-w-xs">
                <h3 className="text-lg font-bold text-zinc-100">
                  Enviando a conserjería...
                </h3>
                <p className="text-xs text-emerald-400 font-mono font-medium animate-pulse">
                  {loadingStepText || 'Procesando solicitud de fotocopias...'}
                </p>
                <p className="text-[11px] text-zinc-400">
                  Destinatario: <code className="text-zinc-300">conserjeria.ies.albalat@educarex.es</code>
                </p>
              </div>

              <div className="w-full space-y-1.5">
                <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
                  {uploadProgress < 100 ? (
                    <motion.div
                      className="bg-emerald-400 h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.15, ease: 'linear' }}
                    />
                  ) : (
                    <motion.div
                      className="bg-emerald-400 h-full rounded-full"
                      animate={{ x: ['-100%', '100%'] }}
                      transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                      style={{ width: '50%' }}
                    />
                  )}
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                  <span>{uploadProgress < 100 ? 'Subida del PDF' : 'Envío del correo'}</span>
                  <span>{uploadProgress < 100 ? `${uploadProgress}%` : 'OK'}</span>
                </div>
              </div>
            </motion.div>
          ) : (
            /* GREEN TICK OF CONFIRMATION WITH "mensaje enviado" */
            <motion.div
              key="success-state"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="space-y-5"
            >
              {/* Top Close button */}
              <div className="flex justify-end -mr-2 -mt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Central Green Tick & Exact Text requested: "mensaje enviado" */}
              <div className="flex flex-col items-center justify-center text-center space-y-3">
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 20, delay: 0.1 }}
                  className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/30"
                >
                  <Check className="w-10 h-10 stroke-[3] text-emerald-400" />
                </motion.div>

                <div className="space-y-1">
                  <motion.h3
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl font-extrabold text-emerald-400 tracking-tight capitalize"
                  >
                    mensaje enviado
                  </motion.h3>
                  <p className="text-xs text-zinc-300">
                    Tu petición de copias ha sido recibida y registrada para conserjería.
                  </p>
                </div>
              </div>

              {/* Details card */}
              {result && (
                <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3.5 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-zinc-300">
                    <span className="text-zinc-400">Destinatario oficial:</span>
                    <span className="font-mono text-zinc-200 truncate ml-2">{result.recipient}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                      <span className="text-zinc-400 block">Profesor:</span>
                      <span className="font-mono font-semibold text-zinc-200">{result.details?.teacherCode}</span>
                    </div>
                    <div className="bg-zinc-900 p-2 rounded-lg border border-zinc-800">
                      <span className="text-zinc-400 block">Copias:</span>
                      <span className="font-mono font-semibold text-emerald-400">{result.details?.copiesCount} ejemplares</span>
                    </div>
                  </div>

                  {result.details?.course && (
                    <div className="bg-zinc-900/90 p-2 rounded-lg border border-zinc-800 text-[11px] flex items-center justify-between">
                      <span className="text-zinc-400">Curso y Grupo:</span>
                      <span className="font-semibold text-emerald-400 font-mono">
                        {result.details.course} {result.details.group ? `- Grupo ${result.details.group}` : ''}
                      </span>
                    </div>
                  )}

                  {pdfName && (
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-zinc-300">
                      <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="truncate">{pdfName}</span>
                    </div>
                  )}
                </div>
              )}

              
              {/* Close / Next action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs transition-colors cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Entendido y Finalizar
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

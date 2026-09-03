import React, { useState } from 'react';
import { CheckCircle2, Copy, ExternalLink, Mail, X, FileText, Send, Download } from 'lucide-react';
import { SendEmailResponse } from '../types';

interface SendActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  result: SendEmailResponse;
  emailSubject: string;
  emailBody: string;
  pdfName?: string;
}

export const SendActionModal: React.FC<SendActionModalProps> = ({
  isOpen,
  onClose,
  result,
  emailSubject,
  emailBody,
  pdfName,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    const fullText = `Destinatario: ${result.recipient}\nAsunto: ${emailSubject}\n\n${emailBody}`;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openInGmail = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      result.recipient
    )}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.open(gmailUrl, '_blank');
  };

  const openInMailto = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(result.recipient)}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoUrl;
  };

  const downloadReceipt = () => {
    const receiptContent = `========================================================\n` +
      `COMPROBANTE DE SOLICITUD DE FOTOCOPIAS - IES ALBALAT\n` +
      `========================================================\n` +
      `Fecha y hora: ${result.timestamp}\n` +
      `Destinatario fijo: ${result.recipient}\n` +
      `Estado: ${result.message}\n\n` +
      `DETALLES:\n` +
      `- Código Profesor: ${result.details?.teacherCode || 'N/A'}\n` +
      `- Número de copias: ${result.details?.copiesCount || 'N/A'}\n` +
      `- Fin de las copias: ${result.details?.purpose || 'N/A'}\n` +
      `- Archivo PDF: ${pdfName || 'Sin adjunto'}\n\n` +
      `CONTENIDO DEL MENSAJE:\n` +
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
      id="send-action-modal-overlay"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="send-action-modal-content"
        className="bg-zinc-900 border border-zinc-700/80 rounded-2xl w-full max-w-lg p-5 sm:p-6 shadow-2xl relative space-y-5 my-8 text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-zinc-100">
                ¡Solicitud Registrada!
              </h3>
              <p className="text-xs text-zinc-400">
                Solicitud enviada correctamente
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status card */}
        <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-zinc-800/80">
            <span className="text-zinc-400">Destinatario oficial:</span>
            <span className="font-mono text-emerald-400 font-semibold">{result.recipient}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800">
              <span className="text-zinc-400 block text-[11px]">Profesor:</span>
              <span className="font-mono text-zinc-200 font-medium">{result.details?.teacherCode}</span>
            </div>
            <div className="bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800">
              <span className="text-zinc-400 block text-[11px]">Ejemplares:</span>
              <span className="font-mono text-emerald-400 font-bold">{result.details?.copiesCount} copias</span>
            </div>
          </div>

          {pdfName && (
            <div className="flex items-center gap-2 text-xs bg-zinc-900/90 p-2.5 rounded-lg border border-zinc-800 text-zinc-300">
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">{pdfName}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Opciones de envío y apertura:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              id="open-gmail-btn"
              onClick={openInGmail}
              className="py-2.5 px-3 rounded-xl bg-red-950/30 hover:bg-red-950/60 border border-red-800/50 text-red-200 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-red-400" />
              <span>Abrir en Gmail Web</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </button>

            <button
              type="button"
              id="open-mailto-btn"
              onClick={openInMailto}
              className="py-2.5 px-3 rounded-xl bg-blue-950/30 hover:bg-blue-950/60 border border-blue-800/50 text-blue-200 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4 text-blue-400" />
              <span>Abrir en Correo de PC</span>
              <ExternalLink className="w-3 h-3 opacity-60" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              id="copy-text-btn"
              onClick={handleCopy}
              className="py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>{copied ? '¡Copiado!' : 'Copiar texto al portapapeles'}</span>
            </button>

            <button
              type="button"
              id="download-receipt-btn"
              onClick={downloadReceipt}
              className="py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar comprobante</span>
            </button>
          </div>
        </div>

        {/* Notice for webmail attachments */}
        <p className="text-[11px] text-zinc-400 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80 leading-relaxed">
          💡 <strong className="text-zinc-300">Nota:</strong> Si abres el correo en Gmail o en tu programa del PC (Outlook/Thunderbird), el destinatario, asunto y texto ya estarán listos. Solo tendrás que confirmar el archivo PDF adjunto antes de pulsar Enviar.
        </p>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-semibold text-xs transition-colors cursor-pointer"
          >
            Entendido y cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

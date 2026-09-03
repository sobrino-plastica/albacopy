import React, { useState, useRef } from 'react';
import { FileUp, FileText, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { AttachedPdf } from '../types';

interface PdfDropzoneProps {
  pdf: AttachedPdf | null;
  onPdfChange: (pdf: AttachedPdf | null) => void;
}

const MAX_PDF_SIZE = 25 * 1024 * 1024;

export const PdfDropzone: React.FC<PdfDropzoneProps> = ({ pdf, onPdfChange }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [loadingFileName, setLoadingFileName] = useState<string>('');
  const [loadingFileSize, setLoadingFileSize] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const processFile = (file: File) => {
    setErrorMessage(null);

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      setErrorMessage('Por favor, selecciona un archivo en formato PDF (.pdf).');
      return;
    }

    if (file.size > MAX_PDF_SIZE) {
      setErrorMessage('El archivo excede el límite de 25 MB. Reduce el tamaño del PDF e inténtalo de nuevo.');
      return;
    }

    setLoadingFileName(file.name);
    setLoadingFileSize(file.size);
    setIsPreparing(true);

    // No FileReader/Base64: conservamos el File binario y lo enviaremos directamente como binario al servidor.
    // Un pequeño siguiente ciclo permite mostrar la animación de preparación sin simular una subida de red.
    requestAnimationFrame(() => {
      onPdfChange({
        name: file.name,
        size: file.size,
        type: file.type || 'application/pdf',
        file,
        lastModified: file.lastModified,
      });
      setIsPreparing(false);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div id="pdf-dropzone-section" className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm sm:text-base font-semibold text-zinc-200 flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          <span>Documento PDF para fotocopias</span>
          <span className="text-rose-400">* Requerido</span>
        </label>
      </div>

      <input
        ref={inputRef}
        type="file"
        id="pdf-file-input"
        accept=".pdf,application/pdf"
        onChange={handleFileChange}
        className="hidden"
      />

      {isPreparing ? (
        <div
          id="pdf-loading-progress-card"
          className="border border-emerald-800/80 bg-zinc-900/90 rounded-xl p-5 space-y-3.5 shadow-lg shadow-emerald-950/30 animate-in fade-in"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-700/80 text-emerald-400 shrink-0">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-100 truncate">{loadingFileName}</p>
              <p className="text-[11px] text-zinc-400 font-mono">{formatFileSize(loadingFileSize)}</p>
            </div>
          </div>
          <div className="w-full bg-zinc-950 rounded-full h-2 overflow-hidden border border-zinc-800">
            <div className="bg-emerald-400 h-full rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>
          <p className="text-[11px] text-zinc-400">Preparando PDF sin convertirlo ni cargarlo en memoria como Base64…</p>
        </div>
      ) : !pdf ? (
        <div
          id="dropzone-area"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-500/10'
              : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900/80'
          }`}
        >
          <div className="flex flex-col items-center justify-center gap-3">
            <div
              className={`p-3 rounded-full transition-colors ${
                isDragging ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400 group-hover:text-zinc-200'
              }`}
            >
              <FileUp className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-200">
                <span className="text-emerald-400 underline decoration-emerald-500/40 underline-offset-2">
                  Haz clic para buscar
                </span>{' '}
                o arrastra el PDF aquí
              </p>
              <p className="text-xs text-zinc-400">
                Arrastra tu archivo directamente desde tu PC o selecciónalo (.pdf hasta 25 MB)
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          id="pdf-attached-card"
          className="border border-emerald-900/60 bg-emerald-950/20 rounded-xl p-4 flex items-center justify-between gap-3 shadow-sm"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-lg bg-emerald-950 border border-emerald-800/80 text-emerald-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100 truncate">{pdf.name}</p>
              <p className="text-xs text-zinc-400 font-mono flex items-center gap-2">
                <span>{formatFileSize(pdf.size)}</span>
                <span>•</span>
                <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  PDF cargado
                </span>
              </p>
            </div>
          </div>

          <button
            id="remove-pdf-btn"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onPdfChange(null);
              if (inputRef.current) inputRef.current.value = '';
            }}
            className="p-2 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
            title="Eliminar archivo y adjuntar otro"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div id="pdf-error-banner" className="flex items-center gap-2 text-xs text-rose-400 bg-rose-950/30 border border-rose-900/60 rounded-lg p-2.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};

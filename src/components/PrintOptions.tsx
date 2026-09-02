import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Layers, Check, FileSpreadsheet } from 'lucide-react';
import { PrintOptionsData } from '../types';

interface PrintOptionsProps {
  options: PrintOptionsData;
  onChange: (options: PrintOptionsData) => void;
}

export const PrintOptions: React.FC<PrintOptionsProps> = ({ options, onChange }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateField = <K extends keyof PrintOptionsData>(field: K, value: PrintOptionsData[K]) => {
    onChange({ ...options, [field]: value });
  };

  return (
    <div id="print-options-container" className="border border-zinc-800 rounded-xl bg-zinc-900/40 overflow-hidden">
      <button
        type="button"
        id="toggle-print-options-btn"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-zinc-800/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-emerald-400" />
          <div>
            <span className="text-sm font-medium text-zinc-200">
              Opciones de formato e impresión
            </span>
            <span className="ml-2 text-xs text-zinc-400 font-mono">
              ({options.paperSize} • {options.doubleSided ? 'Doble cara' : '1 cara'} • {options.colorMode === 'color' ? 'Color' : 'B/N'})
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span>{isExpanded ? 'Ocultar' : 'Personalizar'}</span>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isExpanded && (
        <div id="print-options-body" className="p-4 border-t border-zinc-800 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Double Sided Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Caras de impresión</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateField('doubleSided', true)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    options.doubleSided
                      ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {options.doubleSided && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>Doble cara</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('doubleSided', false)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    !options.doubleSided
                      ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {!options.doubleSided && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                  <span>Una sola cara</span>
                </button>
              </div>
            </div>

            {/* Paper Size */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Tamaño de papel</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateField('paperSize', 'A4')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    options.paperSize === 'A4'
                      ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>A4 (Estándar)</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('paperSize', 'A3')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    options.paperSize === 'A3'
                      ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>A3 (Póster/Doble)</span>
                </button>
              </div>
            </div>

            {/* Color Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Modo de color</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateField('colorMode', 'bn')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    options.colorMode === 'bn'
                      ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>Blanco y Negro</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('colorMode', 'color')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    options.colorMode === 'color'
                      ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span className="text-amber-400">Color (Justificado)</span>
                </button>
              </div>
            </div>

            {/* Stapled Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-400">Grapado de hojas</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateField('stapled', true)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    options.stapled
                      ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>Grapado</span>
                </button>
                <button
                  type="button"
                  onClick={() => updateField('stapled', false)}
                  className={`py-2 px-3 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    !options.stapled
                      ? 'bg-emerald-950/60 border-emerald-600 text-emerald-300 font-semibold'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <span>Sueltas / Sin grapar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Notes / Additional instructions */}
          <div className="space-y-1.5">
            <label htmlFor="notes-input" className="text-xs font-medium text-zinc-400">
              Observaciones o instrucciones adicionales para conserjería (opcional)
            </label>
            <input
              id="notes-input"
              type="text"
              placeholder="Ej: Dejar en casillero de Matemáticas para el jueves 3ª hora..."
              value={options.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>
      )}
    </div>
  );
};

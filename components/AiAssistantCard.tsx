import React, { useState } from 'react';
import { Sparkles, Check, RefreshCw, Eye, Lightbulb } from 'lucide-react';
import { AiOptimizationResult, CopyFormData } from '../types';

interface AiAssistantCardProps {
  formData: CopyFormData;
  aiResult: AiOptimizationResult | null;
  isLoading: boolean;
  onOptimizeWithAi: () => void;
  customSubject: string;
  onSubjectChange: (sub: string) => void;
  customBody: string;
  onBodyChange: (body: string) => void;
}

export const AiAssistantCard: React.FC<AiAssistantCardProps> = ({
  formData,
  aiResult,
  isLoading,
  onOptimizeWithAi,
  customSubject,
  onSubjectChange,
  customBody,
  onBodyChange,
}) => {
  const [showEditor, setShowEditor] = useState(false);

  return (
    <div
      id="ai-assistant-card"
      className="border border-emerald-900/50 bg-gradient-to-b from-emerald-950/20 to-zinc-900/40 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              <span>Asistente IA para el Correo</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                Gemini
              </span>
            </h3>
            <p className="text-xs text-zinc-400">
              Genera automáticamente un asunto y cuerpo formal para la conserjería
            </p>
          </div>
        </div>

        <button
          type="button"
          id="btn-optimize-ai"
          onClick={onOptimizeWithAi}
          disabled={isLoading || !formData.teacherCode}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
            isLoading || !formData.teacherCode
              ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-zinc-950 shadow-md shadow-emerald-950 hover:shadow-emerald-900/40'
          }`}
          title={!formData.teacherCode ? 'Introduce primero el código de profesor' : 'Generar correo con IA'}
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Generando...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>{aiResult ? 'Regenerar con IA' : 'Redactar con IA'}</span>
            </>
          )}
        </button>
      </div>

      {!formData.teacherCode && (
        <p className="text-[11px] text-zinc-500 italic">
          * Rellena al menos el código de profesor arriba para habilitar la redacción inteligente con IA.
        </p>
      )}

      {aiResult && (
        <div id="ai-result-display" className="space-y-3 pt-2 border-t border-zinc-800/80">
          <div className="bg-zinc-950/80 border border-zinc-800 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-400 font-medium">Asunto generado:</span>
              <button
                type="button"
                onClick={() => setShowEditor(!showEditor)}
                className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <Eye className="w-3 h-3" />
                <span>{showEditor ? 'Ocultar editor' : 'Editar texto del correo'}</span>
              </button>
            </div>
            <p className="text-xs font-mono text-emerald-300 bg-zinc-900/90 px-2.5 py-1.5 rounded border border-zinc-800">
              {customSubject}
            </p>
          </div>

          {showEditor ? (
            <div className="space-y-2">
              <div>
                <label className="text-xs text-zinc-400">Modificar Asunto:</label>
                <input
                  type="text"
                  value={customSubject}
                  onChange={(e) => onSubjectChange(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-400">Modificar Cuerpo del Mensaje:</label>
                <textarea
                  rows={6}
                  value={customBody}
                  onChange={(e) => onBodyChange(e.target.value)}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 font-mono leading-relaxed"
                />
              </div>
            </div>
          ) : (
            <div className="text-xs text-zinc-400 bg-zinc-900/60 p-2.5 rounded-lg border border-zinc-800/70 line-clamp-3 font-mono">
              {customBody}
            </div>
          )}

          {aiResult.recommendations && aiResult.recommendations.length > 0 && (
            <div className="flex items-start gap-2 bg-emerald-950/30 border border-emerald-800/40 p-2 rounded-lg text-xs text-emerald-300">
              <Lightbulb className="w-3.5 h-3.5 mt-0.5 text-emerald-400 shrink-0" />
              <div className="space-y-0.5">
                {aiResult.recommendations.map((tip, idx) => (
                  <p key={idx}>• {tip}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

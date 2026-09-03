import React from 'react';
import { RefreshCw, Printer } from 'lucide-react';

interface HeaderProps {
  onReset: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onReset,
}) => {
  return (
    <header id="app-header" className="w-full border-b border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md sticky top-0 z-20">
      <div className="max-w-2xl mx-auto px-4 py-4 relative flex flex-col items-center justify-center text-center">
        {/* Reset button positioned comfortably in top right */}
        <div className="absolute right-3 top-3">
          <button
            id="reset-form-btn"
            type="button"
            onClick={onReset}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition-colors cursor-pointer"
            title="Limpiar formulario"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Centered Photocopier Icon & Brand */}
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/10 shrink-0">
            <Printer className="w-6 h-6" />
          </div>

          <div className="flex flex-col items-center text-center">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-100 tracking-tight">
              Petición de Fotocopias
            </h1>
            <div className="mt-1.5 flex items-center justify-center">
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-700/60 px-3 py-0.5 rounded-full shadow-sm shadow-emerald-500/10">
                IES Albalat
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1.5">
              Gestión directa con conserjería
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};

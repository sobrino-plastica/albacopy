import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, GraduationCap, BookOpen, Users } from 'lucide-react';
import { CopyPurpose } from '../types';

interface PurposeToggleProps {
  value: CopyPurpose;
  onChange: (value: CopyPurpose) => void;
  course: string;
  onCourseChange: (value: string) => void;
  group: string;
  onGroupChange: (value: string) => void;
}

export const PurposeToggle: React.FC<PurposeToggleProps> = ({
  value,
  onChange,
  course,
  onCourseChange,
  group,
  onGroupChange,
}) => {
  return (
    <div id="purpose-toggle-container" className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm sm:text-base font-semibold text-zinc-200 flex items-center gap-2">
          <span>Fin de las copias</span>
          <span className="text-rose-400">*</span>
        </label>
        <span className="text-xs sm:text-sm text-zinc-400">
          {value === 'personal' ? 'Fichas, exámenes...' : 'Material lectivo / Compra alumnado'}
        </span>
      </div>

      {/* Sliding pill container */}
      <div
        id="sliding-tabs-wrapper"
        className="relative bg-zinc-950 border border-zinc-800 rounded-xl p-1 flex items-center shadow-inner"
      >
        {/* Animated slider background */}
        <motion.div
          className="absolute top-1 bottom-1 rounded-lg bg-zinc-800 border border-zinc-700/80 shadow-md"
          initial={false}
          animate={{
            left: value === 'personal' ? '4px' : '50%',
            width: 'calc(50% - 4px)',
          }}
          transition={{ type: 'spring', stiffness: 450, damping: 35 }}
        />

        {/* Tab 1: Uso personal */}
        <button
          id="tab-uso-personal"
          type="button"
          onClick={() => onChange('personal')}
          className={`relative z-10 flex-1 py-2.5 px-3 rounded-lg text-sm sm:text-base font-medium flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer ${
            value === 'personal' ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <User className={`w-4 h-4 transition-transform duration-200 ${value === 'personal' ? 'scale-110 text-emerald-400' : ''}`} />
          <span className="whitespace-nowrap">Uso personal</span>
        </button>

        {/* Tab 2: Copias alumnado */}
        <button
          id="tab-copias-alumnado"
          type="button"
          onClick={() => onChange('alumnado')}
          className={`relative z-10 flex-1 py-2.5 px-3 rounded-lg text-sm sm:text-base font-medium flex items-center justify-center gap-2 transition-colors duration-150 cursor-pointer ${
            value === 'alumnado' ? 'text-emerald-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <GraduationCap className={`w-4 h-4 transition-transform duration-200 ${value === 'alumnado' ? 'scale-110 text-emerald-400' : ''}`} />
          <span className="whitespace-nowrap">Copias alumnado</span>
        </button>
      </div>

      {/* Mandatory Course and Group Fields when Copias alumnado is selected */}
      <AnimatePresence>
        {value === 'alumnado' && (
          <motion.div
            id="student-details-container"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-2 pt-1"
          >
            <div className="p-3.5 rounded-xl bg-zinc-950/60 border border-emerald-950/70 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Field: Curso */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="student-course-input"
                    className="text-sm font-semibold text-zinc-200 flex items-center gap-2"
                  >
                    <BookOpen className="w-4 h-4 text-emerald-400" />
                    <span>Curso</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="student-course-input"
                    type="text"
                    required
                    placeholder="Ej: 3º ESO, 1º Bach..."
                    value={course}
                    onChange={(e) => onCourseChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm sm:text-base font-medium text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {/* Field: Grupo */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="student-group-input"
                    className="text-sm font-semibold text-zinc-200 flex items-center gap-2"
                  >
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span>Grupo</span>
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="student-group-input"
                    type="text"
                    required
                    placeholder="Ej: A, B, C, PMAR..."
                    value={group}
                    onChange={(e) => onGroupChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm sm:text-base font-medium text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>
              <p className="text-xs text-zinc-400">
                Campos obligatorios para identificar a qué aula y alumnos van destinadas las copias en conserjería.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

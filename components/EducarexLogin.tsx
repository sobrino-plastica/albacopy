import React, { useState } from 'react';
import { Lock, Mail, Hash, User, ShieldCheck, AlertCircle, Sparkles, School, ArrowRight } from 'lucide-react';
import { EducarexUser } from '../types';

interface EducarexLoginProps {
  onLoginSuccess: (user: EducarexUser) => void;
}

export const EducarexLogin: React.FC<EducarexLoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedCode = teacherCode.trim().toUpperCase();

    if (!trimmedEmail) {
      setError('Introduce tu correo electrónico institucional de Educarex.');
      return;
    }

    // Strict validation: must be an official @educarex.es account
    if (!trimmedEmail.endsWith('@educarex.es')) {
      setError('Acceso restringido: Es obligatorio iniciar sesión con una cuenta oficial terminada en @educarex.es (ej: usuario@educarex.es).');
      return;
    }

    if (!trimmedCode) {
      setError('El código de profesor es obligatorio para el control de copias en conserjería.');
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const user: EducarexUser = {
        email: trimmedEmail,
        teacherCode: trimmedCode,
        name: name.trim() || undefined,
        department: department.trim() || undefined,
        loggedAt: new Date().toISOString(),
      };

      localStorage.setItem('educarex_auth_session', JSON.stringify(user));
      setIsSubmitting(false);
      onLoginSuccess(user);
    }, 600);
  };

  const handleAutocompleteDomain = () => {
    if (!email) {
      setEmail('profesor@educarex.es');
    } else if (!email.includes('@')) {
      setEmail(`${email.trim()}@educarex.es`);
    } else if (!email.toLowerCase().endsWith('@educarex.es')) {
      const username = email.split('@')[0];
      setEmail(`${username}@educarex.es`);
    }
  };

  const handleQuickDemo = () => {
    setEmail('docente.albalat@educarex.es');
    setTeacherCode('PROF-ALB-12');
    setName('Prof. Manuel Ramos');
    setDepartment('Lengua y Literatura');
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-emerald-950/20 rounded-full blur-2xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Institutional Branding Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mb-2 shadow-lg shadow-emerald-950/40">
            <School className="w-8 h-8" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/80 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Acceso Exclusivo Educarex</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-100">
            IES Albalat • Copistería
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xs mx-auto">
            Inicia sesión con tu cuenta oficial de <strong className="text-emerald-400">@educarex.es</strong> para solicitar fotocopias a conserjería.
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-6 sm:p-7 shadow-2xl backdrop-blur-md space-y-5">
          {error && (
            <div
              id="login-error-alert"
              className="p-3.5 rounded-xl bg-rose-950/50 border border-rose-900/80 text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-200">Acceso no autorizado</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Field: Correo Educarex */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="educarex-email-input" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Correo institucional Educarex</span>
                  <span className="text-rose-400">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutocompleteDomain}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-mono underline cursor-pointer"
                  title="Añadir dominio @educarex.es"
                >
                  + @educarex.es
                </button>
              </div>

              <div className="relative">
                <input
                  id="educarex-email-input"
                  type="email"
                  required
                  placeholder="ejemplo@educarex.es"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono transition-all"
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                Solo se admiten direcciones con terminación <span className="font-mono text-emerald-400">@educarex.es</span>.
              </p>
            </div>

            {/* Field: Código de Profesor */}
            <div className="space-y-1.5">
              <label htmlFor="login-teacher-code" className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-emerald-400" />
                <span>Código de profesor</span>
                <span className="text-rose-400">*</span>
              </label>
              <input
                id="login-teacher-code"
                type="text"
                required
                placeholder="Ej: PROF-204"
                value={teacherCode}
                onChange={(e) => setTeacherCode(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700/80 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 font-mono tracking-wider transition-all"
              />
            </div>

            {/* Optional Fields: Nombre & Departamento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <label htmlFor="login-teacher-name" className="text-xs font-medium text-zinc-400 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>Nombre (opcional)</span>
                </label>
                <input
                  id="login-teacher-name"
                  type="text"
                  placeholder="Tu nombre"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-department" className="text-xs font-medium text-zinc-400">
                  Departamento (opcional)
                </label>
                <input
                  id="login-department"
                  type="text"
                  placeholder="Ej: Matemáticas"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                id="login-submit-btn"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-zinc-950 flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                    <span>Verificando cuenta @educarex.es...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Iniciar sesión con Educarex</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Fill Button */}
          <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-xs text-zinc-400">
            <span>¿Quieres probar rápidamente?</span>
            <button
              type="button"
              id="quick-demo-fill-btn"
              onClick={handleQuickDemo}
              className="text-emerald-400 hover:text-emerald-300 font-medium underline cursor-pointer"
            >
              Cargar datos de prueba
            </button>
          </div>
        </div>

        {/* Security Notice */}
        <div className="flex items-center justify-center gap-2 text-center text-xs text-zinc-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Dirección fija de destino: conserjeria.ies.albalat@educarex.es</span>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Mail, Lock, AlertCircle, Eye, EyeOff, ChevronRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim()
      });

      if (authError || !authData.user) {
        throw new Error('Credenciales incorrectas o cuenta bloqueada temporalmente por seguridad.');
      }

      window.location.reload();
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión.');
      await supabase.auth.signOut();
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans relative overflow-hidden">
      
      <style>{`
        @keyframes float-blob-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(40px, -60px) scale(1.1); }
          66% { transform: translate(-30px, 30px) scale(0.9); }
        }
        @keyframes float-blob-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 60px) scale(1.2); }
          66% { transform: translate(30px, -30px) scale(0.9); }
        }
        @keyframes spin-slow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-float-blob-1 { animation: float-blob-1 25s ease-in-out infinite; }
        .animate-float-blob-2 { animation: float-blob-2 30s ease-in-out infinite; }
        .animate-spin-slow { animation: spin-slow 15s linear infinite; }
        
        .bg-grid {
          background-size: 50px 50px;
          background-image: linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
          mask-image: radial-gradient(circle at center, black 40%, transparent 90%);
          -webkit-mask-image: radial-gradient(circle at center, black 40%, transparent 90%);
        }
        
        .card-shine {
          position: relative;
          overflow: hidden;
        }
        .card-shine::after {
          content: '';
          position: absolute;
          top: 0;
          left: -150%;
          width: 50%;
          height: 100%;
          background: linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 100%);
          transform: skewX(-25deg);
          transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10;
          pointer-events: none;
        }
        .card-shine:hover::after {
          left: 200%;
        }
      `}</style>

      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[60%] bg-blue-600/15 rounded-full blur-[150px] animate-float-blob-1"></div>
        <div className="absolute bottom-[-15%] right-[-10%] w-[50%] h-[50%] bg-sky-600/15 rounded-full blur-[120px] animate-float-blob-2"></div>
        <div className="absolute top-[30%] left-[50%] w-[25%] h-[25%] bg-indigo-500/10 rounded-full blur-[100px] animate-float-blob-1"></div>
        <div className="absolute inset-0 bg-grid"></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-5xl bg-slate-900/60 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col lg:flex-row animate-in fade-in zoom-in-95 duration-500">
          
          <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950 p-12 flex-col justify-between overflow-hidden">
            
            <div className="absolute inset-0 opacity-30">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-[conic-gradient(from_0deg,transparent,#3b82f6,transparent,#0ea5e9,transparent)] animate-spin-slow"></div>
            </div>

            <div className="relative z-10">
              <div className="inline-flex items-center justify-center w-24 h-24 bg-slate-950/80 rounded-3xl shadow-2xl p-3 border border-blue-500/20 mb-8">
                <img src="/logo.png" alt="Fibex Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.6)]" />
              </div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight leading-tight mb-3">
                Control de <span className="text-cyan-400">Troncales</span>
              </h1>
              <p className="text-slate-400 font-medium text-lg">Mantenimiento de Red</p>
              <div className="mt-6 w-16 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"></div>
            </div>

            <div className="relative z-10">
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Sistema integral para el control de tramos, mantenimientos preventivos y asignación de cuadrillas de la Gerencia de O&M.
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                <span>Sistema operativo y en línea</span>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center bg-slate-900/40">
            
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-slate-950/80 rounded-3xl shadow-lg p-2 border border-blue-500/20 mb-4">
                <img src="/logo.png" alt="Fibex Logo" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-2xl font-bold text-white tracking-tight">Control de Troncales</h1>
              <p className="text-slate-400 mt-1 text-sm">Fibex Telecom O&M</p>
            </div>

            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-start gap-3 animate-in slide-in-from-top-2">
                <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-300 font-medium leading-relaxed">{error}</p>
              </div>
            )}

            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Bienvenido de vuelta</h2>
              <p className="text-slate-400 text-sm">Ingresa tus credenciales para acceder al control.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Correo Corporativo</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="block w-full pl-12 pr-4 py-3.5 bg-slate-950/50 border border-slate-700/80 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300"
                    placeholder="usuario@fibextelecom.com"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Contraseña</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-12 pr-12 py-3.5 bg-slate-950/50 border border-slate-700/80 rounded-2xl text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300"
                    placeholder="••••••••"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-500 hover:text-cyan-400 transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="card-shine w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3.5 rounded-2xl font-bold hover:from-blue-500 hover:to-cyan-400 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50 hover:shadow-cyan-900/50 hover:-translate-y-0.5 mt-4"
              >
                {loading ? (
                  <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div><span>Iniciando sesión...</span></>
                ) : (
                  <>
                    <span>Ingresar</span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-white/5 text-center">
              <p className="text-xs text-slate-500">
                ¿Problemas de acceso? Contacte a <span className="text-cyan-400 font-medium">Soporte O&M</span>
              </p>
            </div>

          </div>
        </div>
      </div>

      <div className="fixed bottom-4 left-0 right-0 text-center pointer-events-none">
        <p className="text-xs text-slate-600 font-medium">
          © {new Date().getFullYear()} Fibex Telecom — Control de Troncales O&M
        </p>
      </div>

    </div>
  );
}

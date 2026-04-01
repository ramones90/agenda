import { useAuthStore } from '../../store/auth';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { Heart, User, ArrowLeft, AlertCircle, Shield, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

export default function LoginPatient() {
  const { login, user } = useAuthStore();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login('patient', email, password);
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Erro ao entrar. Verifique suas credenciais.');
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-stone-100 rounded-full blur-3xl -ml-48 -mt-48 opacity-50"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-stone-100 rounded-full blur-3xl -mr-48 -mb-48 opacity-50"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full relative z-10"
      >
        <div className="bg-white p-12 lg:p-16 rounded-[4rem] shadow-2xl shadow-stone-200 border border-stone-100">
          <Link to="/" className="inline-flex items-center gap-3 text-[10px] font-bold text-stone-400 hover:text-stone-900 uppercase tracking-[0.2em] mb-12 transition-all group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Voltar ao Início
          </Link>

          <div className="flex flex-col items-center mb-12">
            <div className="w-20 h-20 bg-stone-50 rounded-[2rem] flex items-center justify-center text-stone-900 mb-8 border border-stone-100 shadow-sm">
              <Heart className="w-10 h-10" />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <Sparkles className="w-5 h-5 text-stone-400" />
              <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Área do Paciente</h4>
            </div>
            <h1 className="text-4xl font-serif italic text-stone-900 text-center">Boas-vindas</h1>
            <p className="text-stone-500 text-center mt-4 font-serif italic text-lg leading-relaxed">
              Continue sua jornada de autoconhecimento e bem-estar.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-8">
            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-6 bg-red-50 border border-red-100 rounded-[2rem] flex items-start gap-4 text-red-600 text-sm"
              >
                <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-serif italic text-lg leading-tight">{error}</p>
                  {error.includes('não encontrado') && (
                    <Link to="/" className="text-red-700 font-bold hover:underline mt-2 block uppercase text-[10px] tracking-widest">
                      Criar uma conta
                    </Link>
                  )}
                </div>
              </motion.div>
            )}

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] ml-2">Seu Email</label>
              <div className="relative">
                <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-16 pr-8 py-6 rounded-[2rem] border border-stone-100 bg-stone-50 focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all text-lg font-serif italic text-stone-800"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] ml-2">Sua Senha</label>
              <div className="relative">
                <Shield className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-16 pr-8 py-6 rounded-[2rem] border border-stone-100 bg-stone-50 focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all text-lg font-serif italic text-stone-800"
                />
              </div>
            </div>

            <button 
              type="submit"
              className="w-full py-6 bg-stone-800 text-white rounded-[2rem] font-bold hover:bg-stone-700 transition-all shadow-xl shadow-stone-200 text-lg"
            >
              Entrar na Jornada
            </button>

            <div className="text-center pt-8 border-t border-stone-50">
              <p className="text-stone-500 font-serif italic text-lg">
                Ainda não tem uma conta?{' '}
                <Link to="/" className="text-stone-900 font-bold hover:underline">
                  Cadastre-se aqui
                </Link>
              </p>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

import { useAuthStore } from '../../store/auth';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { User, UserPlus, AlertCircle, Phone, Calendar, Mail, CheckCircle2, ArrowRight, Shield } from 'lucide-react';
import { motion } from 'motion/react';

export default function RegisterPatient() {
  const { register, user } = useAuthStore();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    birthDate: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await register(formData.name, formData.email, formData.password, 'patient', formData.phone, formData.birthDate);
      navigate('/dashboard');
    } catch (error: any) {
      setError(error.message || 'Erro ao criar conta.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6 font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-6xl w-full bg-white rounded-[4rem] shadow-2xl shadow-stone-200/50 overflow-hidden flex flex-col md:flex-row min-h-[800px] border border-stone-100"
      >
        
        {/* Left Side - Hero/Brand */}
        <div className="md:w-5/12 bg-[#E6E7E2] relative overflow-hidden p-16 flex flex-col justify-between text-stone-900">
          {/* Abstract Background Shapes */}
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-white/30 rounded-full blur-[120px] translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
          
          <div className="relative z-10">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-4 mb-16"
            >
              <div className="w-12 h-12 bg-stone-900 text-white rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-stone-900/10">
                <span className="font-bold text-2xl">Ψ</span>
              </div>
              <span className="font-serif italic text-2xl tracking-tight text-stone-900">PsiConnect</span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="space-y-8"
            >
              <h1 className="text-6xl font-serif italic mb-8 leading-[1.1] tracking-tight text-stone-900">
                Sua jornada de <br />
                <span className="text-stone-500">autoconhecimento.</span>
              </h1>
              <p className="text-stone-600 text-xl leading-relaxed max-w-md font-serif italic">
                Conecte-se com profissionais que entendem sua história e caminham ao seu lado em cada passo.
              </p>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="relative z-10 mt-16 space-y-8"
          >
            <div className="flex items-center gap-6 p-6 bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/20">
              <div className="flex -space-x-4">
                {[1, 2, 3, 4].map((i) => (
                  <img 
                    key={i}
                    src={`https://i.pravatar.cc/100?img=${i + 10}`}
                    alt=""
                    className="w-12 h-12 rounded-full border-4 border-[#E6E7E2] shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
              <div>
                <div className="flex items-center gap-2 text-stone-900 font-bold">
                  <span className="text-lg">4.9/5</span>
                  <div className="flex text-amber-600 text-sm">★★★★★</div>
                </div>
                <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest">Avaliado por +2.000 pacientes</p>
              </div>
            </div>

            <div className="flex gap-4 flex-wrap">
              {['Terapia Online', 'Diário Emocional', 'Segurança Total'].map((tag) => (
                <span key={tag} className="px-4 py-2 rounded-full bg-white/40 border border-white/20 text-[10px] font-bold uppercase tracking-widest text-stone-600">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right Side - Form */}
        <div className="md:w-7/12 p-12 md:p-24 bg-white flex flex-col justify-center">
          <div className="max-w-lg mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mb-12"
            >
              <h2 className="text-4xl font-serif italic text-stone-900 mb-4">Inicie sua jornada</h2>
              <p className="text-stone-500 font-serif italic text-xl">Preencha seus dados para começar este novo caminho de cuidado.</p>
            </motion.div>

            <form onSubmit={handleRegister} className="space-y-6">
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex items-start gap-4 text-rose-600 text-sm"
                >
                  <AlertCircle className="w-6 h-6 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold uppercase tracking-widest text-[10px] mb-1">Atenção</p>
                    <p className="font-serif italic text-lg leading-tight">{error}</p>
                    {error.includes('em uso') && (
                      <Link to="/login/patient" className="text-rose-700 font-bold hover:underline mt-2 block uppercase tracking-widest text-[10px]">
                        Já tem uma conta? Faça Login
                      </Link>
                    )}
                  </div>
                </motion.div>
              )}

              <div className="space-y-6">
                <div className="group">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-2 ml-4">Nome Completo</label>
                  <div className="relative transition-all duration-300 group-focus-within:scale-[1.02]">
                    <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
                    <input 
                      type="text" 
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Ex: João Silva"
                      className="w-full pl-16 pr-6 py-5 rounded-[2rem] border border-stone-100 bg-stone-50/50 focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all placeholder:text-stone-300 text-lg font-serif italic text-stone-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-2 ml-4">Telefone</label>
                    <div className="relative transition-all duration-300 group-focus-within:scale-[1.02]">
                      <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
                      <input 
                        type="tel" 
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        placeholder="(00) 00000-0000"
                        className="w-full pl-16 pr-6 py-5 rounded-[2rem] border border-stone-100 bg-stone-50/50 focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all placeholder:text-stone-300 text-lg font-serif italic text-stone-800"
                      />
                    </div>
                  </div>

                  <div className="group">
                    <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-2 ml-4">Nascimento</label>
                    <div className="relative transition-all duration-300 group-focus-within:scale-[1.02]">
                      <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
                      <input 
                        type="date" 
                        required
                        value={formData.birthDate}
                        onChange={(e) => setFormData({...formData, birthDate: e.target.value})}
                        className="w-full pl-16 pr-6 py-5 rounded-[2rem] border border-stone-100 bg-stone-50/50 focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all text-stone-600 text-lg font-serif italic"
                      />
                    </div>
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-2 ml-4">Email</label>
                  <div className="relative transition-all duration-300 group-focus-within:scale-[1.02]">
                    <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
                    <input 
                      type="email" 
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="seu@email.com"
                      className="w-full pl-16 pr-6 py-5 rounded-[2rem] border border-stone-100 bg-stone-50/50 focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all placeholder:text-stone-300 text-lg font-serif italic text-stone-800"
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-2 ml-4">Senha</label>
                  <div className="relative transition-all duration-300 group-focus-within:scale-[1.02]">
                    <Shield className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
                    <input 
                      type="password" 
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      placeholder="••••••••"
                      className="w-full pl-16 pr-6 py-5 rounded-[2rem] border border-stone-100 bg-stone-50/50 focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all placeholder:text-stone-300 text-lg font-serif italic text-stone-800"
                    />
                  </div>
                </div>
              </div>

              <motion.button 
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={isLoading}
                className="w-full py-6 bg-stone-800 text-white rounded-[2rem] font-bold hover:bg-stone-700 transition-all shadow-2xl shadow-stone-200 hover:shadow-stone-300 disabled:opacity-70 disabled:cursor-not-allowed mt-10 flex items-center justify-center gap-4 group text-lg"
              >
                {isLoading ? (
                  <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Criar Minha Conta
                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </>
                )}
              </motion.button>

              <div className="text-center pt-8">
                <p className="text-stone-500 font-serif italic text-lg">
                  Já tem uma conta?{' '}
                  <Link to="/login/patient" className="text-stone-900 font-bold hover:underline transition-all underline-offset-4">
                    Fazer Login
                  </Link>
                </p>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

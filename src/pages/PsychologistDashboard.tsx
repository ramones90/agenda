import { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { apiFetch } from '../lib/api';
import { AiNoteAssistant } from '../components/AiNoteAssistant';
import { Calendar, Clock, Video, ClipboardList, ArrowRight, Sparkles, Settings, Save, CheckCircle, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';

export default function PsychologistDashboard() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState([]);
  const [pendingQuestionnaires, setPendingQuestionnaires] = useState(0);
  const [mpToken, setMpToken] = useState('');
  const [isSavingToken, setIsSavingToken] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      apiFetch(`/api/appointments?userId=${user.id}&role=psychologist`)
        .then(res => res.json())
        .then(data => setAppointments(data));

      apiFetch(`/api/questionnaires/assignments?psychologistId=${user.id}`)
        .then(res => res.json())
        .then(data => {
          const pending = data.filter((a: any) => a.status === 'pending').length;
          setPendingQuestionnaires(pending);
        });

      apiFetch(`/api/users/${user.id}/mercadopago-status`)
        .then(res => res.json())
        .then(data => setMpToken(data.token || ''));
    }
  }, [user]);

  const handleSaveToken = async () => {
    if (!user) return;
    setIsSavingToken(true);
    try {
      await apiFetch(`/api/users/${user.id}/mercadopago-token`, {
        method: 'POST',
        body: JSON.stringify({ token: mpToken }),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingToken(false);
    }
  };

  return (
    <div className="space-y-8 lg:space-y-12 max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="px-4 py-1.5 bg-stone-100 text-stone-500 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-stone-200">
              Painel do Profissional
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl font-serif italic text-stone-900">Bem-vindo, {user?.name}</h1>
          <p className="text-stone-500 mt-3 font-serif italic text-base lg:text-lg">Sua dedicação transforma vidas hoje.</p>
        </div>
        <div className="text-left md:text-right">
          <p className="text-stone-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Data de Hoje</p>
          <p className="text-lg lg:text-xl font-serif italic text-stone-900">
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column: Appointments & Stats */}
        <div className="lg:col-span-4 space-y-10">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#E6E7E2] p-10 rounded-[3rem] text-stone-900 shadow-sm border border-stone-200 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/50 rounded-full blur-3xl -mr-16 -mt-16"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="w-14 h-14 bg-white/50 rounded-2xl flex items-center justify-center border border-stone-200">
                  <ClipboardList className="w-7 h-7 text-stone-600" />
                </div>
                <Link to="/dashboard/questionnaires" className="w-10 h-10 bg-stone-800 text-white rounded-xl flex items-center justify-center hover:bg-stone-700 transition-all shadow-lg shadow-stone-900/10">
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              <p className="text-stone-500 text-[10px] font-bold uppercase tracking-[0.2em]">Questionários Pendentes</p>
              <h3 className="text-4xl lg:text-5xl font-serif italic mt-2 text-stone-900">{pendingQuestionnaires}</h3>
            </div>
          </motion.div>

          {/* Mercado Pago Settings */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-stone-100"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="text-xl font-serif italic text-stone-900">Pagamentos</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-stone-400 mb-2 block">
                  Mercado Pago Access Token
                </label>
                <div className="relative">
                  <input 
                    type="password"
                    value={mpToken}
                    onChange={(e) => setMpToken(e.target.value)}
                    placeholder="APP_USR-..."
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-800 outline-none transition-all text-sm font-mono"
                  />
                </div>
                <p className="text-[10px] text-stone-400 mt-2 leading-relaxed">
                  Necessário para receber pagamentos das sessões diretamente na sua conta.
                </p>
              </div>
              
              <button 
                onClick={handleSaveToken}
                disabled={isSavingToken}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                  saveSuccess 
                    ? 'bg-emerald-500 text-white' 
                    : 'bg-stone-800 text-white hover:bg-stone-700'
                } disabled:opacity-50`}
              >
                {isSavingToken ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : saveSuccess ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Salvo com Sucesso
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Configurações
                  </>
                )}
              </button>
            </div>
          </motion.div>

          <div className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-serif italic text-stone-900">Próximas Sessões</h2>
              <Link to="/dashboard/calendar" className="text-[10px] font-bold text-stone-400 hover:text-stone-600 uppercase tracking-[0.2em] transition-colors">Ver Agenda</Link>
            </div>

            <div className="space-y-4">
              {appointments.length === 0 ? (
                <div className="text-center py-12 bg-stone-50 rounded-[2.5rem] border border-dashed border-stone-200">
                  <p className="text-stone-400 font-serif italic">Nenhuma sessão agendada.</p>
                </div>
              ) : (
                appointments.map((apt: any) => (
                  <motion.div 
                    key={apt.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 flex items-center gap-5 group hover:border-stone-200 transition-all"
                  >
                    <img 
                      src={apt.patient_avatar || `https://ui-avatars.com/api/?name=${apt.patient_name}`} 
                      alt="" 
                      className="w-16 h-16 rounded-2xl object-cover border border-stone-100" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-serif italic text-xl text-stone-900 truncate">{apt.patient_name}</h3>
                      <div className="flex items-center gap-2 text-[10px] text-stone-400 font-medium uppercase tracking-widest mt-1">
                        <Clock className="w-3 h-3" />
                        {new Date(apt.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <Link 
                      to={`/room/${apt.id}`}
                      className="w-12 h-12 bg-stone-50 text-stone-400 rounded-2xl flex items-center justify-center hover:bg-stone-800 hover:text-white transition-all border border-stone-100"
                    >
                      <Video className="w-5 h-5" />
                    </Link>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: AI Assistant */}
        <div className="lg:col-span-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="h-full"
          >
            <div className="bg-white rounded-[3rem] p-1 shadow-sm border border-stone-100 h-full overflow-hidden">
              <div className="p-8 border-b border-stone-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-stone-600" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-serif italic text-stone-900">Assistente de Notas</h3>
                    <p className="text-stone-500 text-sm font-serif italic">IA para auxiliar em seus registros clínicos</p>
                  </div>
                </div>
              </div>
              <div className="p-2">
                <AiNoteAssistant />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

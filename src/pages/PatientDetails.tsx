import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Mail, Calendar, Phone, MapPin, 
  ChevronLeft, MessageSquare, Video, 
  FileText, Activity, Clock, Plus,
  MoreVertical, Search, Filter, Download,
  CheckCircle2, AlertCircle, BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '../store/auth';
import { apiFetch } from '../lib/api';
import { AiNoteAssistant } from '../components/AiNoteAssistant';

export default function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [patient, setPatient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('prontuario');
  const [sessions, setSessions] = useState([]);
  const [questionnaires, setQuestionnaires] = useState([]);

  useEffect(() => {
    if (id) {
      // Fetch patient details
      apiFetch(`/api/contacts?userId=${user?.id}&role=psychologist`)
        .then(res => res.json())
        .then(data => {
          const found = data.find((p: any) => p.id === id);
          setPatient(found);
          setLoading(false);
        });

      // Mock sessions
      setSessions([
        { id: '1', date: '2024-03-15', time: '14:00', type: 'Individual', status: 'completed', notes: 'Paciente apresentou melhora no quadro de ansiedade...' },
        { id: '2', date: '2024-03-08', time: '14:00', type: 'Individual', status: 'completed', notes: 'Discussão sobre gatilhos emocionais no ambiente de trabalho.' },
        { id: '3', date: '2024-03-22', time: '14:00', type: 'Individual', status: 'scheduled' },
      ]);

      // Mock questionnaires
      setQuestionnaires([
        { id: '1', title: 'Inventário de Ansiedade de Beck (BAI)', date: '2024-03-10', score: 'Moderada (22)', status: 'completed' },
        { id: '2', title: 'Escala de Depressão PHQ-9', date: '2024-03-01', score: 'Leve (8)', status: 'completed' },
        { id: '3', title: 'Questionário de Qualidade de Vida', date: '2024-03-18', status: 'pending' },
      ]);
    }
  }, [id, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-stone-200 border-t-stone-900 rounded-full"
        />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-stone-50 p-8 text-center">
        <AlertCircle className="w-16 h-16 text-stone-300 mb-6" />
        <h2 className="text-3xl font-serif italic text-stone-900 mb-4">Paciente não encontrado</h2>
        <button 
          onClick={() => navigate('/dashboard/patients')}
          className="px-8 py-4 bg-stone-800 text-white rounded-2xl font-bold hover:bg-stone-700 transition-all shadow-xl shadow-stone-200"
        >
          Voltar para Lista
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-6 py-6 lg:py-12 space-y-8 lg:space-y-12 font-sans">
      {/* Header */}
      <header className="flex flex-col lg:flex-row justify-between items-start gap-6 lg:gap-8">
        <div className="flex flex-col md:flex-row items-start gap-4 lg:gap-8 w-full">
          <button 
            onClick={() => navigate('/dashboard/patients')}
            className="p-3 lg:p-4 bg-white rounded-2xl text-stone-400 hover:text-stone-900 shadow-sm border border-stone-100 transition-all"
          >
            <ChevronLeft className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
          <div className="flex items-center gap-4 lg:gap-6">
            <img 
              src={patient.avatar || `https://ui-avatars.com/api/?name=${patient.name}`} 
              alt="" 
              className="w-16 h-16 lg:w-24 lg:h-24 rounded-[1.5rem] lg:rounded-[2.5rem] object-cover border-2 lg:border-4 border-white shadow-lg" 
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-3 mb-1 lg:mb-2">
                <h1 className="text-2xl lg:text-4xl font-serif italic text-stone-900">{patient.name}</h1>
                <div className="px-2 py-0.5 lg:px-3 lg:py-1 bg-emerald-50 text-emerald-600 rounded-full text-[8px] lg:text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
                  Ativo
                </div>
              </div>
              <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 text-stone-500 font-serif italic text-sm lg:text-lg">
                <span className="flex items-center gap-2"><Mail className="w-3 h-3 lg:w-4 lg:h-4" /> {patient.email}</span>
                <span className="hidden md:block w-1 h-1 bg-stone-300 rounded-full"></span>
                <span className="flex items-center gap-2"><Calendar className="w-3 h-3 lg:w-4 lg:h-4" /> Paciente desde Jan 2024</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 lg:gap-4 w-full md:w-auto">
          <button className="flex-1 md:flex-none p-3 lg:p-4 bg-white text-stone-600 rounded-2xl hover:bg-stone-50 transition-all border border-stone-100 shadow-sm flex justify-center">
            <MessageSquare className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
          <button className="flex-1 md:flex-none p-3 lg:p-4 bg-white text-stone-600 rounded-2xl hover:bg-stone-50 transition-all border border-stone-100 shadow-sm flex justify-center">
            <Video className="w-5 h-5 lg:w-6 lg:h-6" />
          </button>
          <button className="flex-[2] md:flex-none px-4 lg:px-8 py-3 lg:py-4 bg-stone-800 text-white rounded-2xl font-bold hover:bg-stone-700 transition-all shadow-xl shadow-stone-200 flex items-center justify-center gap-2 lg:gap-3 text-sm lg:text-base">
            <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
            Nova Sessão
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Info & Stats */}
        <div className="lg:col-span-4 space-y-8">
          {/* Personal Info Card */}
          <section className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-sm space-y-8">
            <h3 className="text-xl font-serif italic text-stone-900 border-b border-stone-50 pb-4">Informações Pessoais</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Telefone</p>
                  <p className="text-stone-900 font-sans">(11) 98765-4321</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Localização</p>
                  <p className="text-stone-900 font-sans">São Paulo, SP</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Frequência</p>
                  <p className="text-stone-900 font-sans">Semanal (Quartas às 14h)</p>
                </div>
              </div>
            </div>
          </section>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-[#E6E7E2] p-6 rounded-[2.5rem] text-stone-900 border border-stone-200 shadow-sm">
              <p className="text-[10px] text-stone-500 font-bold uppercase tracking-widest mb-2">Sessões</p>
              <p className="text-4xl font-serif italic">12</p>
            </div>
            <div className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm">
              <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-2">Faltas</p>
              <p className="text-4xl font-serif italic text-stone-900">0</p>
            </div>
          </div>

          {/* AI Insights Section */}
          <AiNoteAssistant />
        </div>

        {/* Right Column: Tabs & Content */}
        <div className="lg:col-span-8 space-y-8">
          {/* Tabs */}
          <nav className="relative flex items-center gap-1 p-1.5 bg-stone-100 rounded-[2rem] w-full lg:w-fit overflow-x-auto no-scrollbar">
            {[
              { id: 'prontuario', label: 'Prontuário', icon: FileText },
              { id: 'questionarios', label: 'Questionários', icon: CheckCircle2 },
              { id: 'historico', label: 'Histórico', icon: Clock },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-2 lg:gap-3 px-6 lg:px-10 py-3 lg:py-4 rounded-full text-xs lg:text-sm font-bold transition-all whitespace-nowrap z-10 ${
                  activeTab === tab.id 
                    ? 'text-stone-900' 
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-white rounded-full shadow-sm z-[-1]"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <tab.icon className={`w-3.5 h-3.5 lg:w-4 lg:h-4 transition-colors ${activeTab === tab.id ? 'text-stone-900' : 'text-stone-400'}`} />
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Tab Content */}
          <div className="min-h-[600px] relative">
            <AnimatePresence mode="wait">
              {activeTab === 'prontuario' && (
                <motion.div
                  key="prontuario"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-serif italic text-stone-900">Evolução do Paciente</h3>
                    <div className="flex items-center gap-4">
                      <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                        <input 
                          type="text" 
                          placeholder="Buscar notas..." 
                          className="pl-10 pr-4 py-3 bg-white border border-stone-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-stone-100"
                        />
                      </div>
                      <button className="p-3 bg-white text-stone-400 rounded-xl border border-stone-100 hover:text-stone-900 transition-all">
                        <Download className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {sessions.filter(s => s.status === 'completed').map((session: any) => (
                      <div key={session.id} className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-sm hover:border-stone-200 transition-all group">
                        <div className="flex justify-between items-start mb-6">
                          <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-900 font-serif italic text-xl">
                              {new Date(session.date).getDate()}
                            </div>
                            <div>
                              <p className="text-stone-900 font-serif italic text-lg">Sessão Individual</p>
                              <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">
                                {new Date(session.date).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })} • {session.time}
                              </p>
                            </div>
                          </div>
                          <button className="p-2 text-stone-300 hover:text-stone-900 transition-all">
                            <MoreVertical className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-stone-600 font-sans text-base lg:text-lg leading-relaxed">
                          {session.notes}
                        </p>
                        <div className="mt-8 pt-8 border-t border-stone-50 flex items-center gap-4">
                          <div className="px-4 py-1.5 bg-stone-50 text-stone-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-stone-100">
                            Ansiedade
                          </div>
                          <div className="px-4 py-1.5 bg-stone-50 text-stone-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-stone-100">
                            Trabalho
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'questionarios' && (
                <motion.div
                  key="questionarios"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-serif italic text-stone-900">Avaliações e Testes</h3>
                    <button className="px-6 py-3 bg-stone-100 text-stone-900 rounded-xl font-bold hover:bg-stone-200 transition-all flex items-center gap-2">
                      <Plus className="w-4 h-4" />
                      Aplicar Novo
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {questionnaires.map((q: any) => (
                      <div key={q.id} className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-sm hover:border-stone-200 transition-all">
                        <div className="flex justify-between items-start mb-6">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${q.status === 'completed' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                            {q.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                          </div>
                          <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${q.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            {q.status === 'completed' ? 'Concluído' : 'Pendente'}
                          </span>
                        </div>
                        <h4 className="text-xl font-serif italic text-stone-900 mb-2 leading-tight">{q.title}</h4>
                        <p className="text-stone-400 text-xs font-bold uppercase tracking-widest mb-6">
                          {q.status === 'completed' ? `Realizado em ${new Date(q.date).toLocaleDateString('pt-BR')}` : 'Enviado em 18/03/2024'}
                        </p>
                        {q.score && (
                          <div className="p-4 bg-stone-50 rounded-2xl mb-6">
                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mb-1">Resultado</p>
                            <p className="text-stone-900 font-serif italic text-lg">{q.score}</p>
                          </div>
                        )}
                        <button className="w-full py-4 bg-stone-50 text-stone-900 rounded-xl font-bold hover:bg-stone-900 hover:text-white transition-all border border-stone-100 hover:border-stone-900">
                          Ver Detalhes
                        </button>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {activeTab === 'historico' && (
                <motion.div
                  key="historico"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="space-y-8"
                >
                  <h3 className="text-2xl font-serif italic text-stone-900">Linha do Tempo</h3>
                  <div className="relative pl-8 space-y-12 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-px before:bg-stone-100">
                    {sessions.map((session: any) => (
                      <div key={session.id} className="relative">
                        <div className={`absolute -left-10 top-1 w-4 h-4 rounded-full border-4 border-white shadow-sm ${session.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
                        <div className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="text-stone-900 font-serif italic text-lg">Sessão Individual</p>
                              <p className="text-stone-400 text-xs font-bold uppercase tracking-widest">
                                {new Date(session.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })} • {session.time}
                              </p>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${session.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                              {session.status === 'completed' ? 'Realizada' : 'Agendada'}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

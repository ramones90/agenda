import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { apiFetch } from '../lib/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { 
  Smile, Meh, Frown, Calendar, Video, Clock, 
  ArrowRight, Plus, BookOpen, Activity, 
  CheckCircle2, FileText, ListTodo, MessageSquare,
  ChevronRight, ExternalLink, StickyNote, X, Sparkles, ClipboardList,
  Bell, CreditCard, User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

const MOODS = [
  { score: 1, icon: Frown, color: 'text-rose-500', bg: 'bg-rose-100', label: 'Difícil' },
  { score: 2, icon: Meh, color: 'text-orange-500', bg: 'bg-orange-100', label: 'Mais ou menos' },
  { score: 3, icon: Meh, color: 'text-amber-500', bg: 'bg-amber-100', label: 'Ok' },
  { score: 4, icon: Smile, color: 'text-lime-500', bg: 'bg-lime-100', label: 'Bem' },
  { score: 5, icon: Smile, color: 'text-emerald-500', bg: 'bg-emerald-100', label: 'Ótimo' },
];

const PSYCHOLOGIST_QUOTES = [
  { text: "O curioso paradoxo é que quando eu me aceito como eu sou, então eu posso mudar.", author: "Carl Rogers" },
  { text: "Sua visão se tornará clara somente quando você puder olhar para o seu próprio coração.", author: "Carl Jung" },
  { text: "Não somos apenas o que pensamos ser. Somos mais do que isso.", author: "Sigmund Freud" },
  { text: "O autoconhecimento é o começo de toda sabedoria.", author: "Sócrates" },
  { text: "A vida não é sobre encontrar a si mesmo. A vida é sobre criar a si mesmo.", author: "George Bernard Shaw" },
  { text: "O que é necessário para mudar uma pessoa é mudar sua consciência de si mesma.", author: "Abraham Maslow" },
  { text: "Nós somos o que fazemos repetidamente. A excelência, então, não é um ato, mas um hábito.", author: "Aristóteles" },
];

export default function PatientDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [quote, setQuote] = useState(PSYCHOLOGIST_QUOTES[0]);

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      // In a real app, we'd show a success toast
      console.log('Pagamento realizado com sucesso!');
    }
  }, [searchParams]);

  const [moodHistory, setMoodHistory] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [questionnaires, setQuestionnaires] = useState<any[]>([]);
  const [todayMood, setTodayMood] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApt, setSelectedApt] = useState<any>(null);
  const [aptNotes, setAptNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handlePayment = async (apt: any) => {
    setIsProcessingPayment(true);
    try {
      const res = await apiFetch('/api/payments/create-preference', {
        method: 'POST',
        body: JSON.stringify({
          appointmentId: apt.id,
          title: `Sessão com ${apt.psychologist_name}`,
          unit_price: apt.price || 150.0
        })
      });
      const data = await res.json();
      if (data.init_point) {
        window.location.href = data.init_point;
      }
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
    } finally {
      setIsProcessingPayment(false);
    }
  };

  useEffect(() => {
    if (user) {
      Promise.all([
        apiFetch(`/api/mood/${user.id}`).then(res => res.json()),
        apiFetch(`/api/appointments?userId=${user.id}&role=patient`).then(res => res.json()),
        apiFetch(`/api/materials`).then(res => res.json()),
        apiFetch(`/api/tasks?patientId=${user.id}`).then(res => res.json()),
        apiFetch(`/api/questionnaires/assignments?patientId=${user.id}`).then(res => res.json())
      ]).then(([moods, apts, mats, tks, qs]) => {
        setMoodHistory(moods);
        setAppointments(apts);
        setMaterials(mats);
        setTasks(tks);
        setQuestionnaires(qs.filter((q: any) => q.status === 'pending'));
        setIsLoading(false);
      });
    }
  }, [user]);

  const handleMoodSubmit = async (score: number) => {
    setTodayMood(score);
    await apiFetch('/api/mood', {
      method: 'POST',
      body: JSON.stringify({ patientId: user?.id, score, note: 'Check-in rápido' }),
    });
    apiFetch(`/api/mood/${user?.id}`).then(res => res.json()).then(setMoodHistory);
  };

  const toggleTask = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
    await apiFetch(`/api/tasks/${taskId}/complete`, {
      method: 'POST',
      body: JSON.stringify({ status: newStatus }),
    });
  };

  const openAptDetails = async (apt: any) => {
    setSelectedApt(apt);
    const res = await apiFetch(`/api/appointments/${apt.id}/notes`);
    const data = await res.json();
    setAptNotes(data.patient_notes || '');
  };

  const saveAptNotes = async () => {
    if (!selectedApt) return;
    setIsSavingNotes(true);
    await apiFetch(`/api/appointments/${selectedApt.id}/notes`, {
      method: 'POST',
      body: JSON.stringify({ patientNotes: aptNotes }),
    });
    setIsSavingNotes(false);
  };

  const chartData = [...moodHistory].reverse().map((log: any) => ({
    date: new Date(log.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    score: log.score,
  }));

  const nextAppointment = appointments.length > 0 ? appointments[0] : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50">
        <div className="w-10 h-10 border-4 border-stone-800 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 font-sans bg-stone-50">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-5xl font-serif italic text-stone-900 tracking-tight leading-tight">
            Bem-vindo à sua jornada, <br />
            <span className="text-stone-500">{user?.name?.split(' ')[0]}</span>
          </h1>
          <p className="text-stone-400 mt-4 text-xl font-serif italic">Cada passo é um avanço em direção ao seu bem-estar.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-white px-6 py-3 rounded-full shadow-sm border border-stone-100 flex items-center gap-3">
            <Calendar className="w-4 h-4 text-stone-400" />
            <span className="text-sm font-medium text-stone-600">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>
      </header>

      {/* Quote of the Day */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-stone-100 p-12 rounded-[3rem] relative overflow-hidden shadow-sm"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Sparkles className="w-32 h-32 text-stone-900" />
        </div>
        <div className="relative z-10 max-w-4xl">
          <span className="text-[10px] uppercase tracking-[0.2em] text-stone-400 font-bold mb-6 block">Reflexão do Dia</span>
          <p className="text-3xl font-serif italic text-stone-800 leading-relaxed">
            "{quote.text}"
          </p>
          <div className="mt-8 flex items-center gap-4">
            <div className="w-8 h-px bg-stone-200"></div>
            <p className="text-stone-500 font-serif italic text-lg">{quote.author}</p>
          </div>
        </div>
      </motion.div>

      {/* Reminder Banner */}
      {nextAppointment && new Date(nextAppointment.date).getTime() - Date.now() < 24 * 60 * 60 * 1000 && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-[#E6E7E2] text-stone-900 p-6 rounded-[2rem] shadow-sm border border-stone-200 flex flex-col md:flex-row items-center justify-between gap-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/50 rounded-2xl flex items-center justify-center">
              <Bell className="w-6 h-6 text-stone-600" />
            </div>
            <div>
              <p className="font-bold text-lg">Lembrete: Sua consulta é em breve!</p>
              <p className="text-stone-600 opacity-90">
                Sua sessão com {nextAppointment.psychologist_name} começa {new Date(nextAppointment.date).getTime() - Date.now() < 60 * 60 * 1000 ? 'em menos de uma hora' : 'em algumas horas'}.
              </p>
            </div>
          </div>
          <button 
            onClick={() => navigate(`/waiting-room/${nextAppointment.id}`)}
            className="px-8 py-3 bg-stone-800 text-white rounded-xl font-bold hover:bg-stone-700 transition-all whitespace-nowrap shadow-lg shadow-stone-200"
          >
            Preparar Agora
          </button>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* Left Column (8 cols) */}
        <div className="lg:col-span-8 space-y-10">
          
          {/* Next Appointment Hero */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-[3rem] bg-[#EAE7E2] text-stone-900 shadow-sm border border-stone-200"
          >
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-white/30 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
            
            <div className="relative z-10 p-12 md:p-16">
              <div className="flex items-center gap-3 mb-10">
                <div className="px-5 py-2 bg-white/50 text-stone-600 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-stone-200">
                  Próximo Encontro
                </div>
              </div>

              {nextAppointment ? (
                <div className="flex flex-col md:flex-row gap-12 items-start md:items-center justify-between">
                  <div className="space-y-8">
                    <div>
                      <h2 className="text-6xl font-serif italic mb-4 tracking-tight">
                        {new Date(nextAppointment.date).toLocaleDateString('pt-BR', { weekday: 'long' })}
                      </h2>
                      <div className="flex items-center gap-4 text-3xl text-stone-500 font-serif italic">
                        <Clock className="w-8 h-8 text-stone-400" />
                        {new Date(nextAppointment.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-5 p-5 bg-white/40 rounded-[2rem] border border-stone-200 w-fit">
                      <img 
                        src={nextAppointment.psychologist_avatar || `https://ui-avatars.com/api/?name=${nextAppointment.psychologist_name}`} 
                        alt="" 
                        className="w-16 h-16 rounded-2xl border border-stone-200 object-cover" 
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="font-serif italic text-xl leading-tight text-stone-800">{nextAppointment.psychologist_name}</p>
                        <p className="text-stone-500 text-sm font-medium uppercase tracking-widest mt-1">Seu Psicólogo</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 w-full md:w-auto">
                    {nextAppointment.payment_status !== 'paid' && (
                      <button 
                        onClick={() => handlePayment(nextAppointment)}
                        disabled={isProcessingPayment}
                        className="px-12 py-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 shadow-xl shadow-emerald-900/10 disabled:opacity-50"
                      >
                        <CreditCard className="w-6 h-6" />
                        {isProcessingPayment ? 'Processando...' : 'Pagar Sessão'}
                      </button>
                    )}
                    <button 
                      onClick={() => navigate(`/waiting-room/${nextAppointment.id}`)}
                      className="px-12 py-6 bg-stone-800 hover:bg-stone-700 text-white rounded-2xl font-bold transition-all transform hover:scale-[1.02] flex items-center justify-center gap-3 shadow-xl shadow-stone-900/10"
                    >
                      <Video className="w-6 h-6" />
                      Entrar na Sala
                    </button>
                    <button 
                      onClick={() => openAptDetails(nextAppointment)}
                      className="px-12 py-6 bg-white hover:bg-stone-50 text-stone-900 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 border border-stone-200"
                    >
                      <FileText className="w-6 h-6" />
                      Anotações
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-3xl font-serif italic mb-4">Nenhuma sessão agendada</h3>
                  <p className="text-stone-500 mb-10 max-w-md mx-auto text-lg font-serif italic">Que tal dar o próximo passo na sua jornada terapêutica hoje?</p>
                  <Link 
                    to="/dashboard/calendar"
                    className="inline-flex items-center gap-3 px-10 py-5 bg-stone-800 text-white rounded-2xl font-bold transition-all hover:bg-stone-700 shadow-lg shadow-stone-900/10"
                  >
                    <Plus className="w-5 h-5" />
                    Agendar Agora
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* Meu Espaço Navigation */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[
              { to: '/dashboard/journal', icon: BookOpen, label: 'Diário', color: 'bg-emerald-50 text-emerald-600' },
              { to: '/dashboard/calendar', icon: Calendar, label: 'Agenda', color: 'bg-blue-50 text-blue-600' },
              { to: '/dashboard/progress', icon: Activity, label: 'Progresso', color: 'bg-amber-50 text-amber-600' },
              { to: '/dashboard/messages', icon: MessageSquare, label: 'Mensagens', color: 'bg-purple-50 text-purple-600' },
              { to: '/dashboard/profile', icon: User, label: 'Perfil', color: 'bg-stone-100 text-stone-600' },
            ].map((item, i) => (
              <Link 
                key={i}
                to={item.to}
                className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm hover:shadow-md transition-all group text-center flex flex-col items-center gap-4"
              >
                <div className={`w-14 h-14 ${item.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-7 h-7" />
                </div>
                <span className="font-serif italic text-lg text-stone-800">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Secondary Grid: Materials & Tasks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Tasks Section */}
            <div className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-serif italic text-stone-900 flex items-center gap-4">
                  <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center">
                    <ListTodo className="w-6 h-6 text-stone-600" />
                  </div>
                  Suas Atividades
                </h3>
                <span className="px-4 py-1.5 bg-stone-100 text-stone-500 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-stone-200">
                  {tasks.filter(t => t.status === 'pending').length} Pendentes
                </span>
              </div>
              <div className="space-y-4">
                {tasks.length > 0 ? tasks.slice(0, 3).map((task) => (
                  <div 
                    key={task.id} 
                    onClick={() => toggleTask(task.id, task.status)}
                    className={`group flex items-center gap-5 p-6 rounded-[2rem] border transition-all cursor-pointer ${task.status === 'completed' ? 'bg-stone-50 border-transparent opacity-60' : 'bg-white border-stone-100 hover:border-stone-200 shadow-sm'}`}
                  >
                    <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${task.status === 'completed' ? 'bg-stone-800 border-stone-800 text-white' : 'border-stone-200 bg-white group-hover:border-stone-300'}`}>
                      {task.status === 'completed' && <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-serif italic text-lg ${task.status === 'completed' ? 'line-through text-stone-400' : 'text-stone-800'}`}>{task.title}</p>
                      {task.due_date && <p className="text-[10px] text-stone-400 font-medium uppercase tracking-widest mt-1">Até {new Date(task.due_date).toLocaleDateString('pt-BR')}</p>}
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-12 bg-stone-50 rounded-[2rem] border border-dashed border-stone-200">
                    <p className="text-stone-400 font-serif italic">Tudo em dia por aqui.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Materials Section */}
            <div className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-serif italic text-stone-900 flex items-center gap-4">
                  <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-stone-600" />
                  </div>
                  Materiais de Apoio
                </h3>
                <Link to="#" className="text-[10px] font-bold text-stone-400 hover:text-stone-600 uppercase tracking-[0.2em] transition-colors">Ver Todos</Link>
              </div>
              <div className="space-y-4">
                {materials.length > 0 ? materials.slice(0, 3).map((mat) => (
                  <a 
                    key={mat.id} 
                    href={mat.content_url || '#'} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-5 p-6 bg-stone-50 rounded-[2rem] hover:bg-stone-100 transition-all group border border-transparent hover:border-stone-200"
                  >
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm group-hover:text-stone-900 transition-colors border border-stone-100">
                      <FileText className="w-7 h-7" />
                    </div>
                    <div className="flex-1">
                      <p className="font-serif italic text-lg text-stone-800 line-clamp-1">{mat.title}</p>
                      <p className="text-[10px] text-stone-400 font-medium uppercase tracking-widest mt-1">{mat.type}</p>
                    </div>
                    <ExternalLink className="w-5 h-5 text-stone-300 group-hover:text-stone-900 transition-colors" />
                  </a>
                )) : (
                  <div className="text-center py-12 bg-stone-50 rounded-[2rem] border border-dashed border-stone-200">
                    <p className="text-stone-400 font-serif italic">Nenhum material disponível.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Self-Assessment Questionnaires */}
            <div className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm md:col-span-2">
              <div className="flex items-center justify-between mb-10">
                <h3 className="text-2xl font-serif italic text-stone-900 flex items-center gap-4">
                  <div className="w-12 h-12 bg-stone-100 rounded-2xl flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-stone-600" />
                  </div>
                  Autoavaliação
                </h3>
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Acompanhe seu progresso</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {questionnaires.length > 0 ? questionnaires.map((q) => (
                  <Link 
                    key={q.id} 
                    to={`/questionnaire/${q.id}`}
                    className="p-8 rounded-[2.5rem] border border-stone-100 bg-stone-50 hover:bg-white hover:border-stone-200 transition-all group shadow-sm hover:shadow-md"
                  >
                    <h4 className="font-serif italic text-xl mb-4 text-stone-800 group-hover:text-stone-900 leading-tight">{q.template_name}</h4>
                    <div className="flex items-center justify-between">
                      <span className="px-3 py-1 bg-stone-200 text-stone-600 rounded-full text-[9px] font-bold uppercase tracking-widest">Pendente</span>
                      <ArrowRight className="w-5 h-5 text-stone-300 group-hover:text-stone-900 transition-colors" />
                    </div>
                  </Link>
                )) : (
                  <div className="col-span-full py-16 text-center bg-stone-50 rounded-[3rem] border-2 border-dashed border-stone-200">
                    <ClipboardList className="w-12 h-12 text-stone-200 mx-auto mb-4" />
                    <p className="text-stone-400 font-serif italic text-lg">Nenhum questionário pendente no momento.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mood Journey Chart */}
          <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-stone-100">
            <div className="flex items-center justify-between mb-12">
              <div>
                <h2 className="text-3xl font-serif italic text-stone-900">Sua Jornada</h2>
                <p className="text-stone-500 mt-2 font-serif italic">O fluxo das suas emoções ao longo do tempo</p>
              </div>
              <div className="w-14 h-14 bg-stone-100 text-stone-600 rounded-2xl flex items-center justify-center">
                <Activity className="w-7 h-7" />
              </div>
            </div>
            
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1c1917" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#1c1917" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="#a8a29e" 
                    fontSize={11} 
                    tickLine={false} 
                    axisLine={false}
                    dy={15}
                    fontFamily="Inter"
                    fontWeight={500}
                  />
                  <YAxis hide domain={[1, 5]} />
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '24px', 
                      border: '1px solid #e7e5e4', 
                      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.05)',
                      padding: '20px',
                      fontFamily: 'Cormorant Garamond',
                      fontStyle: 'italic',
                      fontSize: '18px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#1c1917" 
                    strokeWidth={3} 
                    fillOpacity={1} 
                    fill="url(#colorScore)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column (4 cols) */}
        <div className="lg:col-span-4 space-y-10">
          {/* Daily Check-in */}
          <div className="bg-white p-10 rounded-[3rem] shadow-xl shadow-stone-200/50 border border-stone-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-stone-50 rounded-full blur-3xl -mr-24 -mt-24"></div>
            
            <div className="relative z-10">
              <h2 className="text-3xl font-serif italic text-stone-900 mb-2">Check-in</h2>
              <p className="text-stone-500 mb-10 font-serif italic">Como você se sente agora?</p>

              {!todayMood ? (
                <div className="grid grid-cols-1 gap-4">
                  {MOODS.map((mood) => (
                    <motion.button
                      key={mood.score}
                      whileHover={{ scale: 1.02, x: 8 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleMoodSubmit(mood.score)}
                      className={`flex items-center gap-5 p-5 rounded-[2rem] border border-stone-100 hover:border-transparent ${mood.bg} hover:shadow-lg transition-all group text-left`}
                    >
                      <div className={`p-4 bg-white rounded-2xl shadow-sm ${mood.color} border border-stone-50`}>
                        <mood.icon className="w-7 h-7" />
                      </div>
                      <span className="font-serif italic text-xl text-stone-700 group-hover:text-stone-900">{mood.label}</span>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 bg-stone-50 rounded-[2.5rem] border border-stone-100">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-md flex items-center justify-center mx-auto mb-6 border border-stone-100">
                    <CheckCircle2 className="w-10 h-10 text-stone-600" />
                  </div>
                  <p className="text-stone-800 font-serif italic text-xl mb-2">Check-in concluído</p>
                  <p className="text-stone-500 text-sm font-medium uppercase tracking-widest">Até amanhã!</p>
                  <button 
                    onClick={() => setTodayMood(null)}
                    className="mt-8 text-[10px] text-stone-400 font-bold uppercase tracking-widest hover:text-stone-600 transition-colors"
                  >
                    Editar Registro
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Messages Preview */}
          <div className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-serif italic text-stone-900 flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-stone-600" />
                Mensagens
              </h3>
              <Link to="/dashboard/messages" className="text-[10px] font-bold text-stone-400 hover:text-stone-600 uppercase tracking-[0.2em] transition-colors">Abrir Chat</Link>
            </div>
            <div className="space-y-4">
              <div className="p-6 bg-stone-50 rounded-[2rem] border border-stone-100">
                <p className="text-[10px] text-stone-400 font-medium uppercase tracking-widest mb-2">Última mensagem</p>
                <p className="text-lg text-stone-600 font-serif italic leading-relaxed">"Olá! Como você está se sentindo após nossa última sessão?"</p>
              </div>
            </div>
          </div>

          {/* History Preview */}
          <div className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-serif italic text-stone-900 flex items-center gap-3">
                <Calendar className="w-6 h-6 text-stone-400" />
                Sessões Passadas
              </h3>
              <Link to="/dashboard/history" className="text-[10px] font-bold text-stone-400 hover:text-stone-600 uppercase tracking-[0.2em] transition-colors">Ver Tudo</Link>
            </div>
            <div className="space-y-4">
              {appointments.filter(a => a.status === 'completed').slice(0, 3).map((apt) => (
                <div key={apt.id} className="flex items-center gap-5 p-4 hover:bg-stone-50 rounded-[2rem] transition-all cursor-pointer group border border-transparent hover:border-stone-100" onClick={() => openAptDetails(apt)}>
                  <div className="text-center min-w-[4rem] bg-white p-3 rounded-2xl shadow-sm border border-stone-100 group-hover:border-stone-200 transition-all">
                    <p className="text-[9px] text-stone-400 uppercase font-bold tracking-widest">
                      {new Date(apt.date).toLocaleDateString('pt-BR', { month: 'short' })}
                    </p>
                    <p className="text-xl font-serif italic text-stone-900">
                      {new Date(apt.date).getDate()}
                    </p>
                  </div>
                  <div className="flex-1">
                    <p className="font-serif italic text-lg text-stone-900">{apt.psychologist_name}</p>
                    <p className="text-[10px] text-stone-400 font-medium uppercase tracking-widest">Sessão Concluída</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-stone-300 group-hover:text-stone-900 transition-colors" />
                </div>
              ))}
              {appointments.filter(a => a.status === 'completed').length === 0 && (
                <div className="text-center py-10 bg-stone-50 rounded-[2rem] border border-dashed border-stone-200">
                  <p className="text-stone-400 font-serif italic">Nenhuma sessão anterior.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Details Modal */}
      <AnimatePresence>
        {selectedApt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-stone-100"
            >
              <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-stone-800 text-white rounded-2xl flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-serif italic text-stone-900">Detalhes da Sessão</h3>
                    <p className="text-sm text-stone-500 font-serif italic">{new Date(selectedApt.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedApt(null)} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-stone-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8">
                {/* Psychologist Info */}
                <div className="flex items-center gap-6 p-6 bg-stone-50 rounded-3xl border border-stone-100">
                  <img 
                    src={selectedApt.psychologist_avatar || `https://ui-avatars.com/api/?name=${selectedApt.psychologist_name}`} 
                    alt="" 
                    className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-sm" 
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h4 className="text-xl font-serif italic text-stone-900">{selectedApt.psychologist_name}</h4>
                    <p className="text-stone-500 mb-2 font-serif italic text-sm">Especialista em Saúde Mental</p>
                    <div className="flex items-center gap-2 text-sm text-stone-900 font-bold">
                      <Clock className="w-4 h-4" />
                      {new Date(selectedApt.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Private Notes Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif italic text-stone-900 flex items-center gap-2">
                      <StickyNote className="w-5 h-5 text-stone-400" />
                      Suas Anotações Privadas
                    </h4>
                    <span className="text-[10px] text-stone-400 uppercase tracking-widest font-bold">Apenas você pode ver</span>
                  </div>
                  <textarea 
                    value={aptNotes}
                    onChange={(e) => setAptNotes(e.target.value)}
                    placeholder="O que você gostaria de abordar nesta sessão? Como tem se sentido desde a última vez?"
                    className="w-full h-40 p-5 bg-stone-50 border border-stone-200 rounded-3xl focus:ring-2 focus:ring-stone-800 focus:border-transparent outline-none transition-all text-stone-700 resize-none font-serif italic"
                  />
                  <button 
                    onClick={saveAptNotes}
                    disabled={isSavingNotes}
                    className="w-full py-4 bg-stone-800 text-white rounded-2xl font-bold hover:bg-stone-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-stone-900/10"
                  >
                    {isSavingNotes ? 'Salvando...' : 'Salvar Anotações'}
                  </button>
                </div>

                {/* Preparation Tips */}
                <div className="p-6 bg-stone-50 rounded-3xl border border-stone-100">
                  <h4 className="font-serif italic text-stone-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-stone-400" />
                    Dica de Preparação
                  </h4>
                  <p className="text-sm text-stone-600 leading-relaxed font-serif italic">
                    Tente reservar 5-10 minutos antes da sessão para respirar fundo e revisar suas anotações. Isso ajuda a entrar no estado mental ideal para o seu processo terapêutico.
                  </p>
                </div>
              </div>

              <div className="p-8 bg-stone-50 border-t border-stone-100 flex flex-col sm:flex-row gap-4">
                {selectedApt.status === 'scheduled' && (
                  <>
                    {selectedApt.payment_status !== 'paid' && (
                      <button 
                        onClick={() => handlePayment(selectedApt)}
                        disabled={isProcessingPayment}
                        className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/10 disabled:opacity-50"
                      >
                        <CreditCard className="w-5 h-5" />
                        {isProcessingPayment ? 'Processando...' : 'Pagar Agora'}
                      </button>
                    )}
                    <button 
                      onClick={() => navigate(`/waiting-room/${selectedApt.id}`)}
                      className="flex-1 py-4 bg-stone-800 text-white rounded-2xl font-bold hover:bg-stone-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-stone-900/10"
                    >
                      <Video className="w-5 h-5" />
                      Ir para Sala de Espera
                    </button>
                  </>
                )}
                <button className="flex-1 py-4 bg-white text-stone-600 border border-stone-200 rounded-2xl font-bold hover:bg-stone-100 transition-all">
                  Reagendar Sessão
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

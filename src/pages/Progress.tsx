import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { apiFetch } from '../lib/api';
import { 
  Activity, 
  TrendingUp, 
  Target, 
  Award,
  Calendar,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from 'recharts';

export default function Progress() {
  const { user } = useAuthStore();
  const [moodHistory, setMoodHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      apiFetch(`/api/mood/${user.id}`)
        .then(res => res.json())
        .then(data => {
          setMoodHistory(data);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }
  }, [user]);

  const chartData = [...moodHistory].reverse().map((log: any) => ({
    date: new Date(log.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    score: log.score,
  }));

  const stats = [
    { label: 'Sessões Realizadas', value: '12', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-50' },
    { label: 'Check-ins de Humor', value: moodHistory.length.toString(), icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { label: 'Metas Concluídas', value: '8', icon: Target, color: 'text-amber-500', bg: 'bg-amber-50' },
    { label: 'Dias de Jornada', value: '45', icon: Award, color: 'text-purple-500', bg: 'bg-purple-50' },
  ];

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-stone-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 space-y-16">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="px-4 py-1.5 bg-stone-100 text-stone-500 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-stone-200">
              Seu Desenvolvimento
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-serif italic text-stone-900 tracking-tight">Seu Progresso</h1>
          <p className="text-stone-500 font-serif italic text-xl max-w-xl leading-relaxed">
            Acompanhe sua evolução, celebre suas pequenas vitórias e visualize sua jornada de autoconhecimento.
          </p>
        </div>
        <div className="w-20 h-20 bg-[#E6E7E2] text-stone-900 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-stone-200 -rotate-3">
          <TrendingUp className="w-10 h-10" />
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-8 rounded-[2.5rem] border border-stone-100 shadow-sm hover:shadow-md transition-all group"
          >
            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
              <stat.icon className="w-7 h-7" />
            </div>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-4xl font-serif italic text-stone-900">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Main Chart */}
        <div className="lg:col-span-8 space-y-12">
          <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-stone-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-stone-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50"></div>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-12">
                <div>
                  <h2 className="text-3xl font-serif italic text-stone-900">Evolução do Bem-estar</h2>
                  <p className="text-stone-500 mt-2 font-serif italic">Seu histórico de humor nos últimos registros</p>
                </div>
                <div className="w-14 h-14 bg-stone-50 text-stone-600 rounded-2xl flex items-center justify-center border border-stone-100">
                  <Activity className="w-7 h-7" />
                </div>
              </div>
              
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1c1917" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#1c1917" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
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
                    <YAxis 
                      stroke="#a8a29e" 
                      fontSize={11} 
                      tickLine={false} 
                      axisLine={false}
                      domain={[1, 5]}
                      ticks={[1, 2, 3, 4, 5]}
                      fontFamily="Inter"
                      fontWeight={500}
                    />
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

          {/* Recent Achievements */}
          <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-stone-100">
            <h2 className="text-3xl font-serif italic text-stone-900 mb-10">Conquistas Recentes</h2>
            <div className="space-y-6">
              {[
                { title: 'Persistência', desc: '7 dias consecutivos de check-in de humor.', icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-50' },
                { title: 'Autoconhecimento', desc: 'Completou seu primeiro questionário PHQ-9.', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                { title: 'Comprometimento', desc: 'Realizou 5 sessões sem faltas.', icon: Award, color: 'text-blue-500', bg: 'bg-blue-50' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-6 p-6 bg-stone-50 rounded-[2.5rem] border border-stone-100 hover:bg-white hover:shadow-md transition-all group">
                  <div className={`w-14 h-14 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                    <item.icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-xl font-serif italic text-stone-900">{item.title}</h4>
                    <p className="text-stone-500 font-serif italic">{item.desc}</p>
                  </div>
                  <ArrowUpRight className="w-6 h-6 text-stone-200 group-hover:text-stone-900 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="lg:col-span-4 space-y-10">
          <div className="bg-stone-900 text-white p-10 rounded-[3rem] shadow-2xl shadow-stone-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24"></div>
            <div className="relative z-10">
              <h3 className="text-2xl font-serif italic mb-6">Próxima Meta</h3>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-3">
                    <span className="font-serif italic opacity-80">Redução de Ansiedade</span>
                    <span className="font-bold">65%</span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '65%' }}
                      transition={{ duration: 1, delay: 0.5 }}
                      className="h-full bg-white rounded-full"
                    />
                  </div>
                </div>
                <p className="text-sm font-serif italic opacity-60 leading-relaxed">
                  Você está progredindo muito bem! Continue praticando os exercícios de respiração recomendados.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm">
            <h3 className="text-2xl font-serif italic text-stone-900 mb-8">Insights da IA</h3>
            <div className="space-y-6">
              <div className="p-6 bg-stone-50 rounded-[2rem] border border-stone-100 italic font-serif text-stone-600 leading-relaxed">
                "Notamos que seu humor tende a melhorar significativamente nos dias em que você realiza suas atividades físicas matinais."
              </div>
              <div className="p-6 bg-stone-50 rounded-[2rem] border border-stone-100 italic font-serif text-stone-600 leading-relaxed">
                "Suas anotações mostram uma evolução positiva na forma como você lida com situações de estresse no trabalho."
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

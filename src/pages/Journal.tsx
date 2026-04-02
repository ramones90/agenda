import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { apiFetch } from '../lib/api';
import { BookOpen, Clock, Sparkles, Quote } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const MOOD_COLORS = {
  5: 'bg-emerald-400',
  4: 'bg-emerald-200',
  3: 'bg-stone-200',
  2: 'bg-orange-200',
  1: 'bg-rose-400',
};

const MOOD_LABELS = {
  5: 'Ótimo',
  4: 'Bem',
  3: 'Ok',
  2: 'Mais ou menos',
  1: 'Difícil',
};

export default function Journal() {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      apiFetch(`/api/mood/${user.id}`)
        .then(res => res.json())
        .then(data => {
          setLogs(data);
          setIsLoading(false);
        })
        .catch(() => setIsLoading(false));
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-stone-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-16 max-w-5xl mx-auto px-4 py-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="px-4 py-1.5 bg-stone-100 text-stone-500 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-stone-200">
              Sua Jornada
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-serif italic text-stone-900 tracking-tight">Diário Emocional</h1>
          <p className="text-stone-500 font-serif italic text-xl max-w-xl leading-relaxed">
            Um espaço seguro e acolhedor para suas reflexões, sentimentos e descobertas diárias.
          </p>
        </div>
        <div className="w-20 h-20 bg-[#E6E7E2] text-stone-900 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-stone-200 rotate-3">
          <BookOpen className="w-10 h-10" />
        </div>
      </header>

      <div className="grid gap-10">
        <AnimatePresence mode="popLayout">
          {logs.length > 0 ? (
            logs.map((log: any, index: number) => (
              <motion.div 
                key={log.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white p-10 md:p-14 rounded-[4rem] shadow-sm border border-stone-100 relative overflow-hidden group hover:border-stone-200 hover:shadow-xl transition-all duration-500"
              >
                <div className="absolute top-0 right-0 w-64 h-64 bg-stone-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>
                
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                    <div className="flex items-center gap-8">
                      <div className="text-center min-w-[5.5rem] bg-stone-50 p-6 rounded-[2rem] border border-stone-100 shadow-sm group-hover:bg-white transition-colors">
                        <p className="text-[10px] text-stone-400 uppercase font-bold tracking-[0.2em] mb-1">
                          {new Date(log.date).toLocaleDateString('pt-BR', { month: 'short' })}
                        </p>
                        <p className="text-4xl font-serif italic text-stone-900">
                          {new Date(log.date).getDate()}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-2xl font-serif italic text-stone-900 capitalize">
                          {new Date(log.date).toLocaleDateString('pt-BR', { weekday: 'long' })}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-stone-400 font-bold uppercase tracking-[0.2em]">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(log.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 px-6 py-3 bg-stone-50 rounded-full border border-stone-100 group-hover:bg-white transition-colors">
                      <div className={`w-3 h-3 rounded-full shadow-sm ${MOOD_COLORS[log.score as keyof typeof MOOD_COLORS] || 'bg-stone-300'}`} />
                      <span className="text-[10px] font-bold text-stone-600 uppercase tracking-[0.2em]">
                        Sentindo-se {MOOD_LABELS[log.score as keyof typeof MOOD_LABELS] || 'Indefinido'}
                      </span>
                    </div>
                  </div>

                  <div className="relative pl-12">
                    <Quote className="absolute left-0 top-0 w-8 h-8 text-stone-100 -translate-x-2 -translate-y-2" />
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-stone-100 rounded-full"></div>
                    <p className="text-2xl md:text-3xl text-stone-800 font-serif italic leading-relaxed">
                      {log.note || "Nenhuma anotação registrada para este dia."}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-32 bg-stone-50 rounded-[5rem] border-2 border-dashed border-stone-200"
            >
              <div className="w-28 h-28 bg-white rounded-[3rem] flex items-center justify-center mx-auto mb-10 shadow-sm border border-stone-100">
                <Sparkles className="w-14 h-14 text-stone-200" />
              </div>
              <h3 className="text-4xl font-serif italic text-stone-900 mb-6">Sua história começa aqui</h3>
              <p className="text-stone-400 font-serif italic text-xl max-w-lg mx-auto leading-relaxed">
                Faça seu check-in diário no dashboard para começar a registrar seus sentimentos, reflexões e momentos importantes.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

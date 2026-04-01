import { useState } from 'react';
import { Sparkles, Loader2, Check, BrainCircuit, MessageSquareText, Lightbulb } from 'lucide-react';
import { motion } from 'motion/react';

export function AiNoteAssistant() {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!notes.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/ai/analyze-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] p-6 lg:p-10 h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 h-full">
        <div className="space-y-6 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-stone-100 rounded-xl flex items-center justify-center">
              <MessageSquareText className="w-5 h-5 text-stone-600" />
            </div>
            <label className="text-sm font-bold text-stone-400 uppercase tracking-[0.2em]">
              Anotações da Sessão
            </label>
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="flex-1 w-full min-h-[300px] p-6 lg:p-8 rounded-[2rem] border border-stone-100 bg-stone-50 focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all text-base lg:text-lg font-sans text-stone-800 resize-none shadow-inner"
            placeholder="Descreva aqui os pontos principais da sessão, sentimentos expressos e observações clínicas..."
          />
          <button
            onClick={handleAnalyze}
            disabled={loading || !notes}
            className="flex items-center justify-center gap-3 w-full py-5 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 disabled:opacity-50 transition-all shadow-xl shadow-stone-200 group"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 group-hover:rotate-12 transition-transform" />}
            {loading ? 'Processando Insights...' : 'Gerar Insights Clínicos'}
          </button>
        </div>

        <div className="bg-stone-50 rounded-[2.5rem] p-8 lg:p-12 border border-stone-100 h-full relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-3xl -mr-32 -mt-32 opacity-50"></div>
          
          {!analysis ? (
            <div className="h-full flex flex-col items-center justify-center text-stone-300 text-center relative z-10">
              <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-stone-100">
                <BrainCircuit className="w-10 h-10 opacity-20" />
              </div>
              <p className="text-xl font-serif italic max-w-[250px]">Os insights gerados pela IA aparecerão aqui após a análise.</p>
            </div>
          ) : (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="space-y-10 relative z-10"
            >
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm border border-stone-100">
                    <Lightbulb className="w-4 h-4 text-stone-400" />
                  </div>
                  <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Resumo Clínico</h4>
                </div>
                <p className="text-lg lg:text-xl text-stone-800 font-sans leading-relaxed">{analysis.summary}</p>
              </div>
              
              <div>
                <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] mb-4">Temas Identificados</h4>
                <div className="flex flex-wrap gap-3">
                  {(analysis.themes || []).map((tag: string, i: number) => (
                    <span key={i} className="px-4 py-2 bg-white border border-stone-200 rounded-xl text-xs font-bold text-stone-600 uppercase tracking-widest shadow-sm">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-6 border-t border-stone-200">
                <div className="bg-white p-8 rounded-[2rem] border border-stone-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 bg-stone-900 text-white rounded-lg flex items-center justify-center">
                      <Check className="w-4 h-4" />
                    </div>
                    <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Sugestão de Intervenção</h4>
                  </div>
                  <p className="text-base lg:text-lg text-stone-800 font-sans leading-relaxed">
                    {analysis.intervention}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ArrowLeft, Send, AlertCircle, Loader2 } from 'lucide-react';

export default function AnswerQuestionnaire() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/questionnaires/assignments/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setAssignment(data);
      })
      .catch(() => setError('Erro ao carregar questionário.'));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(answers).length < assignment.questions.length) {
      alert('Por favor, responda todas as perguntas.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/questionnaires/responses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignment_id: id, answers }),
      });
      if (res.ok) setIsSuccess(true);
      else throw new Error();
    } catch {
      alert('Erro ao enviar respostas.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-[2rem] border border-stone-200 shadow-sm max-w-md w-full"
        >
          <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif italic text-stone-900 mb-2">Ops! Algo deu errado</h2>
          <p className="text-stone-600 mb-8">{error}</p>
          <button 
            onClick={() => navigate(-1)} 
            className="w-full py-4 bg-stone-900 text-stone-50 rounded-2xl font-medium hover:bg-stone-800 transition-all"
          >
            Voltar
          </button>
        </motion.div>
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-stone-300 animate-spin" />
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-12 rounded-[3rem] border border-stone-200 shadow-sm max-w-lg w-full"
        >
          <motion.div 
            initial={{ scale: 0 }} 
            animate={{ scale: 1 }} 
            transition={{ type: "spring", damping: 12, stiffness: 200 }}
            className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8"
          >
            <CheckCircle2 className="w-12 h-12" />
          </motion.div>
          <h2 className="text-4xl font-serif italic text-stone-900 mb-4">Obrigado!</h2>
          <p className="text-stone-600 mb-10 text-lg leading-relaxed">
            Suas respostas foram enviadas com sucesso e estarão disponíveis para seu psicólogo.
          </p>
          <button 
            onClick={() => navigate('/dashboard')} 
            className="w-full py-5 bg-stone-900 text-stone-50 rounded-2xl font-medium hover:bg-stone-800 transition-all text-lg"
          >
            Voltar ao Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-20">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <header className="mb-12 space-y-6">
          <button 
            onClick={() => navigate(-1)} 
            className="group flex items-center gap-2 text-stone-400 hover:text-stone-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl font-serif italic text-stone-900 tracking-tight leading-tight">
              {assignment.template_name}
            </h1>
            <p className="text-stone-600 text-lg leading-relaxed max-w-2xl">
              {assignment.description}
            </p>
          </div>

          {assignment.instructions && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 bg-white rounded-[2rem] border border-stone-200 text-stone-800 text-sm leading-relaxed shadow-sm relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-1 h-full bg-stone-900/10" />
              <h4 className="font-serif italic text-base text-stone-900 mb-2">Instruções:</h4>
              <p className="text-stone-600 italic">{assignment.instructions}</p>
            </motion.div>
          )}
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <AnimatePresence mode="popLayout">
            {assignment.questions.map((q: any, i: number) => (
              <motion.div 
                key={q.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-8 md:p-10 rounded-[2.5rem] border border-stone-200 shadow-sm space-y-8"
              >
                <div className="flex gap-6">
                  <span className="flex-shrink-0 w-10 h-10 bg-stone-50 text-stone-400 rounded-full flex items-center justify-center text-sm font-medium border border-stone-100">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h3 className="text-xl md:text-2xl font-serif italic text-stone-900 pt-1 leading-snug">
                    {q.text}
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {q.options.map((opt: any) => (
                    <label 
                      key={opt.value}
                      className={`group flex items-center gap-5 p-6 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                        answers[q.id] === opt.value 
                          ? 'bg-stone-900 border-stone-900 shadow-lg shadow-stone-900/10' 
                          : 'bg-stone-50 border-stone-100 hover:border-stone-300 hover:bg-white'
                      }`}
                    >
                      <div className="relative z-10 flex items-center justify-center">
                        <input 
                          type="radio" 
                          name={q.id} 
                          value={opt.value} 
                          checked={answers[q.id] === opt.value}
                          onChange={(e) => setAnswers({...answers, [q.id]: e.target.value})}
                          className="sr-only"
                        />
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          answers[q.id] === opt.value 
                            ? 'border-stone-50 bg-stone-50' 
                            : 'border-stone-300 bg-white group-hover:border-stone-400'
                        }`}>
                          {answers[q.id] === opt.value && (
                            <div className="w-2.5 h-2.5 rounded-full bg-stone-900" />
                          )}
                        </div>
                      </div>
                      <span className={`relative z-10 font-medium text-base transition-colors ${
                        answers[q.id] === opt.value ? 'text-stone-50' : 'text-stone-600'
                      }`}>
                        {opt.label}
                      </span>
                    </label>
                  ))}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex justify-end pt-8"
          >
            <button 
              type="submit"
              disabled={isSubmitting}
              className="group px-12 py-6 bg-stone-900 text-stone-50 rounded-2xl font-medium hover:bg-stone-800 transition-all flex items-center gap-4 shadow-2xl shadow-stone-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              )}
              <span className="text-lg">{isSubmitting ? 'Enviando...' : 'Enviar Respostas'}</span>
            </button>
          </motion.div>
        </form>
      </div>
    </div>
  );
}

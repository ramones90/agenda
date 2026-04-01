import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, Download, Share2, 
  CheckCircle2, Clock, User, 
  Calendar, FileText, BarChart3,
  ArrowRight, MessageSquare, Filter, BrainCircuit
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/auth';

export default function QuestionnaireResponses() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState<any>(null);

  useEffect(() => {
    // Mock fetching questionnaire response
    setTimeout(() => {
      setResponse({
        id: id,
        title: 'Inventário de Ansiedade de Beck (BAI)',
        patientName: 'Maria Silva',
        date: '2024-03-15',
        score: 22,
        interpretation: 'Ansiedade Moderada',
        answers: [
          { question: 'Dormência ou formigamento', answer: 'Moderadamente (2)', category: 'Físico' },
          { question: 'Sensação de calor', answer: 'Gravemente (3)', category: 'Físico' },
          { question: 'Tremores nas pernas', answer: 'Levemente (1)', category: 'Físico' },
          { question: 'Incapaz de relaxar', answer: 'Gravemente (3)', category: 'Emocional' },
          { question: 'Medo de que aconteça o pior', answer: 'Moderadamente (2)', category: 'Emocional' },
          { question: 'Aterrorizado ou medroso', answer: 'Levemente (1)', category: 'Emocional' },
          { question: 'Nervosismo', answer: 'Gravemente (3)', category: 'Emocional' },
          { question: 'Sensação de sufocação', answer: 'Não (0)', category: 'Físico' },
        ]
      });
      setLoading(false);
    }, 800);
  }, [id]);

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

  return (
    <div className="max-w-5xl mx-auto px-6 py-12 space-y-12 font-sans">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start gap-8">
        <div className="flex items-start gap-8">
          <button 
            onClick={() => navigate(-1)}
            className="p-4 bg-white rounded-2xl text-stone-400 hover:text-stone-900 shadow-sm border border-stone-100 transition-all"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="px-4 py-1.5 bg-stone-100 text-stone-500 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-stone-200">
                Resultado de Avaliação
              </div>
            </div>
            <h1 className="text-4xl font-serif italic text-stone-900">{response.title}</h1>
            <div className="flex items-center gap-4 mt-4 text-stone-500 font-serif italic text-lg">
              <span className="flex items-center gap-2"><User className="w-4 h-4" /> {response.patientName}</span>
              <span className="w-1 h-1 bg-stone-300 rounded-full"></span>
              <span className="flex items-center gap-2"><Calendar className="w-4 h-4" /> {new Date(response.date).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-4 bg-white text-stone-600 rounded-2xl hover:bg-stone-50 transition-all border border-stone-100 shadow-sm">
            <Share2 className="w-6 h-6" />
          </button>
          <button className="px-8 py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-xl shadow-stone-200 flex items-center gap-3">
            <Download className="w-5 h-5" />
            Exportar PDF
          </button>
        </div>
      </header>

      {/* Score Summary Card */}
      <section className="bg-stone-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-48 -mt-48"></div>
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
          <div className="space-y-2">
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Pontuação Total</p>
            <div className="flex items-baseline gap-2">
              <span className="text-7xl font-serif italic">{response.score}</span>
              <span className="text-stone-400 text-xl font-serif italic">pontos</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Interpretação Clínica</p>
            <p className="text-3xl font-serif italic text-amber-400">{response.interpretation}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-[2rem] border border-white/10">
            <div className="flex items-center gap-3 mb-3 text-stone-300">
              <BarChart3 className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-widest">Distribuição</span>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  <span>Físico</span>
                  <span>65%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-[65%]"></div>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-stone-400">
                  <span>Emocional</span>
                  <span>35%</span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-white w-[35%]"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Answers */}
      <section className="space-y-8">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl font-serif italic text-stone-900">Respostas Detalhadas</h3>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-stone-400">
              <Filter className="w-4 h-4" />
              Filtrar por Categoria
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] border border-stone-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-100">
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-stone-400">Questão</th>
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-stone-400">Categoria</th>
                <th className="px-8 py-6 text-[10px] font-bold uppercase tracking-widest text-stone-400">Resposta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {response.answers.map((item: any, i: number) => (
                <tr key={i} className="group hover:bg-stone-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <p className="text-stone-900 font-serif italic text-lg">{item.question}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="px-3 py-1 bg-stone-100 text-stone-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-stone-200">
                      {item.category}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        item.answer.includes('(3)') ? 'bg-rose-500' :
                        item.answer.includes('(2)') ? 'bg-amber-500' :
                        item.answer.includes('(1)') ? 'bg-emerald-500' : 'bg-stone-200'
                      }`}></div>
                      <span className="text-stone-700 font-serif italic text-lg">{item.answer}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Clinical Notes / AI Analysis */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm space-y-6">
          <div className="flex items-center gap-4 text-stone-900">
            <FileText className="w-6 h-6" />
            <h3 className="text-2xl font-serif italic">Observações Clínicas</h3>
          </div>
          <textarea 
            placeholder="Adicione suas observações sobre este resultado..."
            className="w-full h-48 bg-stone-50 rounded-[2rem] p-6 text-stone-800 font-serif italic text-lg outline-none focus:ring-4 focus:ring-stone-100 border border-stone-100 transition-all resize-none"
          ></textarea>
          <button className="w-full py-4 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-lg shadow-stone-200">
            Salvar Observações
          </button>
        </div>

        <div className="bg-stone-50 p-10 rounded-[3rem] border border-stone-100 space-y-6 relative overflow-hidden">
          <BrainCircuit className="absolute top-8 right-8 w-12 h-12 text-stone-200" />
          <div className="flex items-center gap-4 text-stone-900 relative z-10">
            <BarChart3 className="w-6 h-6" />
            <h3 className="text-2xl font-serif italic">Análise de Tendências</h3>
          </div>
          <p className="text-stone-600 font-serif italic text-lg leading-relaxed relative z-10">
            Comparado ao último teste realizado em 01/03/2024, houve um aumento de 14 pontos na escala de ansiedade. Os sintomas físicos (calor e tremores) tornaram-se mais pronunciados.
          </p>
          <div className="pt-6 relative z-10">
            <button className="text-stone-900 font-bold text-sm uppercase tracking-widest flex items-center gap-2 hover:gap-4 transition-all">
              Ver Histórico Comparativo
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

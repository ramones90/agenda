import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ClipboardList, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Users, 
  FileText,
  Calendar,
  BarChart3,
  ArrowLeft,
  X,
  Sparkles,
  Eye,
  Video
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { Link, useNavigate } from 'react-router-dom';

interface Template {
  id: string;
  name: string;
  description: string;
  is_standardized: boolean;
}

interface Assignment {
  id: string;
  patient_id: string;
  template_id: string;
  template_name: string;
  assigned_at: string;
  due_date: string;
  status: 'pending' | 'completed';
  psychologist_name: string;
}

export default function Questionnaires() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'assignments' | 'templates'>('assignments');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [templatesRes, assignmentsRes, patientsRes] = await Promise.all([
          fetch('/api/questionnaires/templates'),
          fetch(`/api/questionnaires/assignments?psychologistId=${user?.id}`),
          fetch(`/api/patients?psychologistId=${user?.id}`)
        ]);
        
        setTemplates(await templatesRes.json());
        setAssignments(await assignmentsRes.json());
        setPatients(await patientsRes.json());
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (user) fetchData();
  }, [user]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !selectedPatient) return;

    try {
      const res = await fetch('/api/questionnaires/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient,
          psychologistId: user?.id,
          templateId: selectedTemplate,
          dueDate
        })
      });

      if (res.ok) {
        setShowAssignModal(false);
        // Refresh assignments
        const assignmentsRes = await fetch(`/api/questionnaires/assignments?psychologistId=${user?.id}`);
        setAssignments(await assignmentsRes.json());
      }
    } catch (error) {
      alert('Erro ao atribuir questionário.');
    }
  };

  const handleStartCall = async (patientId: string) => {
    try {
      // Create a quick appointment for now
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          psychologistId: user?.id,
          patientId,
          date: new Date().toISOString()
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // Send a message to the patient
        await fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            senderId: user?.id,
            receiverId: patientId,
            content: `Olá! Vi que você concluiu o questionário. Vamos conversar agora? Entre na sala: ${window.location.origin}/waiting-room/${data.id}`
          })
        });

        navigate(`/room/${data.id}`);
      }
    } catch (error) {
      console.error('Error starting call:', error);
      alert('Erro ao iniciar chamada.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50">
        <div className="w-10 h-10 border-4 border-stone-900 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 py-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="px-4 py-1.5 bg-stone-100 text-stone-500 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-stone-200">
              Instrumentos Clínicos
            </div>
          </div>
          <h1 className="text-5xl font-serif italic text-stone-900">Questionários</h1>
          <p className="text-stone-500 mt-3 font-serif italic text-lg">Gerencie e aplique instrumentos de avaliação aos seus pacientes.</p>
        </div>
        <button 
          onClick={() => setShowAssignModal(true)}
          className="flex items-center gap-3 px-10 py-5 bg-stone-900 text-white rounded-2xl font-bold hover:bg-stone-800 transition-all shadow-xl shadow-stone-200"
        >
          <Plus className="w-5 h-5" />
          Atribuir Questionário
        </button>
      </header>

      <div className="flex gap-2 p-1.5 bg-stone-100 rounded-[2rem] w-fit border border-stone-200 shadow-inner">
        <button 
          onClick={() => setActiveTab('assignments')}
          className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${activeTab === 'assignments' ? 'bg-white text-stone-900 shadow-sm border border-stone-200' : 'text-stone-400 hover:text-stone-600'}`}
        >
          Atribuições
        </button>
        <button 
          onClick={() => setActiveTab('templates')}
          className={`px-8 py-3 rounded-[1.5rem] text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${activeTab === 'templates' ? 'bg-white text-stone-900 shadow-sm border border-stone-200' : 'text-stone-400 hover:text-stone-600'}`}
        >
          Modelos
        </button>
      </div>

      {activeTab === 'assignments' ? (
        <div className="grid grid-cols-1 gap-6">
          {assignments.length === 0 ? (
            <div className="text-center py-24 bg-stone-50 rounded-[4rem] border-2 border-dashed border-stone-200">
              <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-sm border border-stone-100">
                <ClipboardList className="w-12 h-12 text-stone-200" />
              </div>
              <h3 className="text-3xl font-serif italic text-stone-900 mb-4">Nenhuma atribuição</h3>
              <p className="text-stone-400 font-serif italic text-xl max-w-md mx-auto">
                Comece atribuindo um questionário a um de seus pacientes.
              </p>
            </div>
          ) : (
            assignments.map((assignment, index) => (
              <motion.div 
                key={assignment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white p-8 rounded-[3rem] border border-stone-100 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-8 group"
              >
                <div className="flex items-center gap-8">
                  <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center border ${assignment.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                    {assignment.status === 'completed' ? <CheckCircle2 className="w-10 h-10" /> : <Clock className="w-10 h-10" />}
                  </div>
                  <div>
                    <h3 className="font-serif italic text-2xl text-stone-900 mb-2">{assignment.template_name}</h3>
                    <div className="flex flex-wrap items-center gap-6">
                      <span className="flex items-center gap-2 text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                        <Users className="w-3.5 h-3.5" />
                        Paciente: {patients.find(p => p.id === assignment.patient_id)?.name || 'Carregando...'}
                      </span>
                      <span className="flex items-center gap-2 text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                        <Calendar className="w-3.5 h-3.5" />
                        Atribuído em {new Date(assignment.assigned_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <span className={`px-5 py-2 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border ${assignment.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                    {assignment.status === 'completed' ? 'Concluído' : 'Pendente'}
                  </span>
                  {assignment.status === 'completed' ? (
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => handleStartCall(assignment.patient_id)}
                        className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                        title="Iniciar Chamada de Vídeo"
                      >
                        <Video className="w-6 h-6" />
                      </button>
                      <Link 
                        to={`/dashboard/questionnaires/responses/${assignment.id}`}
                        className="w-14 h-14 bg-stone-900 text-white rounded-2xl flex items-center justify-center hover:bg-stone-800 transition-all shadow-lg shadow-stone-200"
                        title="Ver Respostas"
                      >
                        <Eye className="w-6 h-6" />
                      </Link>
                    </div>
                  ) : (
                    <button className="w-14 h-14 bg-stone-50 text-stone-400 rounded-2xl flex items-center justify-center hover:bg-stone-900 hover:text-white transition-all border border-stone-100">
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  )}
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {templates.map((template, index) => (
            <motion.div 
              key={template.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-stone-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="relative z-10">
                <div className="w-16 h-16 bg-stone-50 text-stone-400 rounded-[1.5rem] flex items-center justify-center mb-8 group-hover:bg-stone-900 group-hover:text-white transition-all border border-stone-100">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-serif italic text-stone-900 mb-4 leading-tight">{template.name}</h3>
                <p className="text-stone-500 font-serif italic text-lg leading-relaxed mb-10 line-clamp-3">{template.description}</p>
                <div className="flex items-center justify-between pt-8 border-t border-stone-50">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${template.is_standardized ? 'text-stone-900' : 'text-stone-400'}`}>
                    {template.is_standardized ? 'Padronizado' : 'Personalizado'}
                  </span>
                  <button className="text-[10px] font-bold text-stone-400 hover:text-stone-900 uppercase tracking-[0.2em] transition-colors">
                    Ver Detalhes
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Assign Modal */}
      <AnimatePresence>
        {showAssignModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[4rem] shadow-2xl overflow-hidden"
            >
              <div className="p-12 lg:p-16 space-y-12">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <Sparkles className="w-5 h-5 text-stone-400" />
                      <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Nova Atribuição</h4>
                    </div>
                    <h2 className="text-4xl font-serif italic text-stone-900">Atribuir Questionário</h2>
                  </div>
                  <button onClick={() => setShowAssignModal(false)} className="w-12 h-12 bg-stone-50 text-stone-400 rounded-2xl flex items-center justify-center hover:bg-stone-100 transition-all border border-stone-100">
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <form onSubmit={handleAssign} className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] ml-2">Instrumento de Avaliação</label>
                    <select 
                      value={selectedTemplate}
                      onChange={(e) => setSelectedTemplate(e.target.value)}
                      className="w-full p-6 bg-stone-50 border border-stone-100 rounded-[2rem] focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all text-lg font-serif italic text-stone-800 appearance-none cursor-pointer"
                      required
                    >
                      <option value="">Escolha um questionário...</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] ml-2">Paciente</label>
                    <select 
                      value={selectedPatient}
                      onChange={(e) => setSelectedPatient(e.target.value)}
                      className="w-full p-6 bg-stone-50 border border-stone-100 rounded-[2rem] focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all text-lg font-serif italic text-stone-800 appearance-none cursor-pointer"
                      required
                    >
                      <option value="">Escolha um paciente...</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] ml-2">Data Limite de Entrega</label>
                    <div className="relative">
                      <Calendar className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
                      <input 
                        type="date" 
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full pl-16 pr-8 py-6 bg-stone-50 border border-stone-100 rounded-[2rem] focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all text-lg font-serif italic text-stone-800 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-6">
                    <button 
                      type="submit"
                      className="w-full py-6 bg-stone-900 text-white rounded-[2rem] font-bold hover:bg-stone-800 transition-all shadow-xl shadow-stone-200 text-lg"
                    >
                      Confirmar Atribuição
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

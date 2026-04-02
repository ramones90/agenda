import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuthStore } from '../store/auth';
import { apiFetch } from '../lib/api';
import { UserPlus, Users, Loader2, Shield, Sparkles, Search, Filter, Mail, User, Plus, History, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [psychologists, setPsychologists] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [activeTab, setActiveTab] = useState<'psychologists' | 'logs'>('psychologists');
  const [loading, setLoading] = useState(false);
  const [newPsy, setNewPsy] = useState({ name: '', email: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    if (activeTab === 'psychologists') {
      fetchPsychologists();
    } else {
      fetchAuditLogs();
    }
  }, [activeTab]);

  const fetchPsychologists = async () => {
    const res = await apiFetch('/api/admin/psychologists');
    const data = await res.json();
    setPsychologists(data);
  };

  const fetchAuditLogs = async () => {
    const res = await apiFetch('/api/admin/audit-logs');
    const data = await res.json();
    setAuditLogs(data);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await apiFetch('/api/admin/psychologists', {
        method: 'POST',
        body: JSON.stringify(newPsy),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create');
      }

      setNewPsy({ name: '', email: '' });
      fetchPsychologists();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto px-4 py-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="px-4 py-1.5 bg-stone-100 text-stone-500 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-stone-200">
              Gestão de Plataforma
            </div>
          </div>
          <h1 className="text-5xl font-serif italic text-stone-900">Painel Administrativo</h1>
          <p className="text-stone-500 mt-3 font-serif italic text-lg">Gerencie os profissionais e a infraestrutura da jornada.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-stone-100 p-1 rounded-2xl border border-stone-200">
            <button 
              onClick={() => setActiveTab('psychologists')}
              className={`px-6 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'psychologists' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
            >
              Psicólogos
            </button>
            <button 
              onClick={() => setActiveTab('logs')}
              className={`px-6 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'logs' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
            >
              Logs de Segurança
            </button>
          </div>
          <div className="w-14 h-14 bg-[#E6E7E2] text-stone-900 rounded-2xl flex items-center justify-center shadow-xl shadow-stone-200">
            <Shield className="w-7 h-7" />
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'psychologists' ? (
          <motion.div 
            key="psychologists"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-12"
          >
            {/* Create Form */}
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-stone-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-stone-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="relative z-10">
                  <div className="flex items-center gap-4 mb-10">
                    <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-900 border border-stone-100 shadow-sm">
                      <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-stone-400" />
                        <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Novo Cadastro</h4>
                      </div>
                      <h2 className="text-2xl font-serif italic text-stone-900">Psicólogo</h2>
                    </div>
                  </div>

                  <form onSubmit={handleCreate} className="space-y-8">
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] ml-2">Nome Completo</label>
                      <div className="relative">
                        <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
                        <input
                          type="text"
                          required
                          value={newPsy.name}
                          onChange={(e) => setNewPsy({ ...newPsy, name: e.target.value })}
                          className="w-full pl-16 pr-8 py-5 bg-stone-50 border border-stone-100 rounded-[2rem] focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all text-lg font-serif italic text-stone-800"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] ml-2">Email Profissional</label>
                      <div className="relative">
                        <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
                        <input
                          type="email"
                          required
                          value={newPsy.email}
                          onChange={(e) => setNewPsy({ ...newPsy, email: e.target.value })}
                          className="w-full pl-16 pr-8 py-5 bg-stone-50 border border-stone-100 rounded-[2rem] focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all text-lg font-serif italic text-stone-800"
                        />
                      </div>
                    </div>

                    {error && (
                      <p className="text-sm text-red-500 font-serif italic px-2">{error}</p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-6 bg-stone-800 text-white rounded-[2rem] font-bold hover:bg-stone-700 disabled:opacity-50 flex items-center justify-center gap-3 transition-all shadow-xl shadow-stone-200 text-lg"
                    >
                      {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Plus className="w-6 h-6" />}
                      Cadastrar Profissional
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* List */}
            <div className="lg:col-span-8 space-y-8">
              <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-stone-100">
                <div className="flex items-center justify-between mb-12">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-900 border border-stone-100 shadow-sm">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">Profissionais</h4>
                      </div>
                      <h2 className="text-2xl font-serif italic text-stone-900">Psicólogos Ativos</h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="relative group hidden md:block">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Buscar..." 
                        className="pl-12 pr-6 py-3 bg-stone-50 border border-stone-100 rounded-full focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all text-sm font-serif italic text-stone-800 w-64"
                      />
                    </div>
                    <button className="w-12 h-12 bg-stone-50 text-stone-400 rounded-2xl flex items-center justify-center hover:bg-stone-100 transition-all border border-stone-100">
                      <Filter className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-4">
                    <thead>
                      <tr className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">
                        <th className="pb-4 pl-6">Profissional</th>
                        <th className="pb-4">Email</th>
                        <th className="pb-4">Status</th>
                        <th className="pb-4 pr-6 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {psychologists.map((psy: any, index: number) => (
                        <motion.tr 
                          key={psy.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="group"
                        >
                          <td className="py-6 pl-6 bg-stone-50/50 group-hover:bg-stone-50 rounded-l-[2rem] transition-colors">
                            <div className="flex items-center gap-4">
                              <img src={psy.avatar || `https://ui-avatars.com/api/?name=${psy.name}`} alt="" className="w-12 h-12 rounded-2xl object-cover border border-stone-100 shadow-sm" referrerPolicy="no-referrer" />
                              <span className="font-serif italic text-lg text-stone-900">{psy.name}</span>
                            </div>
                          </td>
                          <td className="py-6 bg-stone-50/50 group-hover:bg-stone-50 transition-colors">
                            <span className="text-stone-500 font-serif italic text-lg">{psy.email}</span>
                          </td>
                          <td className="py-6 bg-stone-50/50 group-hover:bg-stone-50 transition-colors">
                            <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100">
                              Ativo
                            </span>
                          </td>
                          <td className="py-6 pr-6 bg-stone-50/50 group-hover:bg-stone-50 rounded-r-[2rem] text-right transition-colors">
                            <button className="text-[10px] font-bold text-stone-400 hover:text-stone-900 uppercase tracking-widest transition-colors">
                              Gerenciar
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="logs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-stone-100">
              <div className="flex items-center gap-4 mb-12">
                <div className="w-14 h-14 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-900 border border-stone-100 shadow-sm">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-serif italic text-stone-900">Logs de Auditoria</h2>
                  <p className="text-stone-500 font-serif italic text-lg">Histórico de eventos de segurança e ações administrativas.</p>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-4">
                  <thead>
                    <tr className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em]">
                      <th className="pb-4 pl-6">Data/Hora</th>
                      <th className="pb-4">Evento</th>
                      <th className="pb-4">Nível</th>
                      <th className="pb-4">Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log: any, index: number) => (
                      <motion.tr 
                        key={log.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className="group"
                      >
                        <td className="py-6 pl-6 bg-stone-50/50 group-hover:bg-stone-50 rounded-l-[2rem] transition-colors">
                          <span className="text-stone-500 font-serif italic text-sm">
                            {new Date(log.timestamp).toLocaleString('pt-BR')}
                          </span>
                        </td>
                        <td className="py-6 bg-stone-50/50 group-hover:bg-stone-50 transition-colors">
                          <div className="flex items-center gap-2">
                            {log.level === 'error' ? <AlertTriangle className="w-4 h-4 text-rose-500" /> : 
                             log.level === 'warning' ? <Info className="w-4 h-4 text-amber-500" /> : 
                             <CheckCircle className="w-4 h-4 text-emerald-500" />}
                            <span className="font-bold text-stone-900 text-sm">{log.event}</span>
                          </div>
                        </td>
                        <td className="py-6 bg-stone-50/50 group-hover:bg-stone-50 transition-colors">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                            log.level === 'error' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                            log.level === 'warning' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                            'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                            {log.level}
                          </span>
                        </td>
                        <td className="py-6 pr-6 bg-stone-50/50 group-hover:bg-stone-50 rounded-r-[2rem] transition-colors">
                          <code className="text-xs text-stone-400 font-mono break-all">
                            {log.details}
                          </code>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

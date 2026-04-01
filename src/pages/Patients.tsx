import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { Search, MoreHorizontal, User, Mail, Calendar, ArrowRight, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';

export default function Patients() {
  const { user } = useAuthStore();
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user) {
      fetch(`/api/contacts?userId=${user.id}&role=psychologist`)
        .then(res => res.json())
        .then(setPatients);
    }
  }, [user]);

  const filteredPatients = patients.filter((p: any) => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12 max-w-6xl mx-auto px-4 py-8">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="px-4 py-1.5 bg-stone-100 text-stone-500 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-stone-200">
              Gestão Clínica
            </div>
          </div>
          <h1 className="text-5xl font-serif italic text-stone-900">Seus Pacientes</h1>
          <p className="text-stone-500 mt-3 font-serif italic text-lg">Acompanhe a evolução e o bem-estar de quem confia em você.</p>
        </div>
        <div className="w-14 h-14 bg-[#E6E7E2] text-stone-900 rounded-2xl flex items-center justify-center shadow-xl shadow-stone-200">
          <User className="w-7 h-7" />
        </div>
      </header>

      <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
        <div className="relative w-full md:max-w-md group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 group-focus-within:text-stone-900 transition-colors" />
          <input 
            type="text" 
            placeholder="Buscar por nome ou email..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-16 pr-8 py-5 rounded-[2rem] border border-stone-100 bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all text-lg font-serif italic text-stone-800 shadow-sm"
          />
        </div>
        <button className="flex items-center gap-3 px-8 py-5 bg-stone-100 text-stone-600 rounded-2xl font-bold hover:bg-stone-200 transition-all border border-stone-200">
          <Filter className="w-5 h-5" />
          Filtros Avançados
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredPatients.map((patient: any, index: number) => (
          <motion.div 
            key={patient.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white p-8 rounded-[3rem] shadow-sm border border-stone-100 hover:border-stone-200 transition-all group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-stone-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="relative z-10">
              <div className="flex items-center gap-5 mb-8">
                <img 
                  src={patient.avatar || `https://ui-avatars.com/api/?name=${patient.name}`} 
                  alt="" 
                  className="w-20 h-20 rounded-[2rem] object-cover border border-stone-100 shadow-sm" 
                  referrerPolicy="no-referrer" 
                />
                <div>
                  <h3 className="text-2xl font-serif italic text-stone-900 leading-tight">{patient.name}</h3>
                  <div className="flex items-center gap-2 text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Ativo
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-10">
                <div className="flex items-center gap-3 text-stone-500">
                  <Mail className="w-4 h-4 text-stone-300" />
                  <span className="text-sm font-serif italic truncate">{patient.email}</span>
                </div>
                <div className="flex items-center gap-3 text-stone-500">
                  <Calendar className="w-4 h-4 text-stone-300" />
                  <span className="text-sm font-serif italic">Início: Jan 2024</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link 
                  to={`/dashboard/patients/${patient.id}`}
                  className="flex-1 py-4 bg-stone-50 text-stone-900 rounded-2xl font-bold hover:bg-stone-900 hover:text-white transition-all text-center border border-stone-100 hover:border-stone-900"
                >
                  Ver Prontuário
                </Link>
                <button className="w-14 h-14 bg-stone-50 text-stone-400 rounded-2xl flex items-center justify-center hover:bg-stone-100 transition-all border border-stone-100">
                  <MoreHorizontal className="w-6 h-6" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}

        {filteredPatients.length === 0 && (
          <div className="col-span-full py-24 text-center bg-stone-50 rounded-[4rem] border-2 border-dashed border-stone-200">
            <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-sm border border-stone-100">
              <Search className="w-12 h-12 text-stone-200" />
            </div>
            <h3 className="text-3xl font-serif italic text-stone-900 mb-4">Nenhum paciente encontrado</h3>
            <p className="text-stone-400 font-serif italic text-xl max-w-md mx-auto">
              Tente ajustar sua busca ou filtros para encontrar o paciente desejado.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

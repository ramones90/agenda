import { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { apiFetch } from '../lib/api';
import { Calendar as CalendarIcon, Clock, User, Plus, X, Check, ChevronRight, Video, Link as LinkIcon, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function CalendarPage() {
  const { user } = useAuthStore();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isBooking, setIsBooking] = useState(false);
  const [isConfiguringAvailability, setIsConfiguringAvailability] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  
  // Booking State
  const [step, setStep] = useState(1);
  const [selectedContact, setSelectedContact] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [workDays, setWorkDays] = useState<number[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [availabilityRules, setAvailabilityRules] = useState<any[]>([]);

  useEffect(() => {
    fetchAppointments();
    fetchContacts();
    if (user?.role === 'psychologist') {
      checkGoogleStatus();
      fetchAvailabilityRules();
    }
  }, [user]);

  useEffect(() => {
    if (selectedContact) {
      fetchWorkDays();
    }
  }, [selectedContact]);

  useEffect(() => {
    if (selectedDate && selectedContact) {
      fetchAvailability();
    }
  }, [selectedDate, selectedContact]);

  const fetchWorkDays = async () => {
    const psychologistId = user?.role === 'psychologist' ? user.id : selectedContact;
    if (!psychologistId) return;
    try {
      const res = await apiFetch(`/api/psychologists/${psychologistId}/work-days`);
      const data = await res.json();
      setWorkDays(data);
    } catch (error) {
      console.error('Failed to fetch work days', error);
    }
  };

  const fetchAvailability = async () => {
    const psychologistId = user?.role === 'psychologist' ? user.id : selectedContact;
    if (!psychologistId) return;

    setIsLoadingSlots(true);
    try {
      const res = await apiFetch(`/api/psychologists/${psychologistId}/availability?date=${selectedDate}`);
      const data = await res.json();
      setAvailableSlots(data.slots || []);
    } catch (error) {
      console.error('Failed to fetch availability', error);
    } finally {
      setIsLoadingSlots(false);
    }
  };

  const fetchAvailabilityRules = async () => {
    if (!user) return;
    try {
      const res = await apiFetch(`/api/psychologists/${user.id}/availability-rules`);
      const data = await res.json();
      setAvailabilityRules(data);
    } catch (error) {
      console.error('Failed to fetch availability rules', error);
    }
  };

  const handleSaveAvailability = async (newRules: any[]) => {
    if (!user) return;
    try {
      await apiFetch(`/api/psychologists/${user.id}/availability`, {
        method: 'POST',
        body: JSON.stringify({ availability: newRules }),
      });
      setAvailabilityRules(newRules);
      setIsConfiguringAvailability(false);
      fetchWorkDays(); // Refresh work days
    } catch (error) {
      console.error('Failed to save availability', error);
    }
  };

  const checkGoogleStatus = async () => {
    if (!user) return;
    try {
      const res = await apiFetch(`/api/users/${user.id}/google-status`);
      const data = await res.json();
      setIsGoogleConnected(data.isConnected);
    } catch (error) {
      console.error('Failed to check google status', error);
    }
  };

  const handleConnectGoogle = async () => {
    if (!user) return;
    try {
      const res = await apiFetch(`/api/auth/google/url?userId=${user.id}`);
      const { url } = await res.json();
      
      const width = 500;
      const height = 600;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;
      
      window.open(
        url,
        'google_auth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'GOOGLE_AUTH_SUCCESS') {
          setIsGoogleConnected(true);
          window.removeEventListener('message', handleMessage);
        }
      };
      window.addEventListener('message', handleMessage);

    } catch (error) {
      console.error('Failed to get auth url', error);
    }
  };

  const fetchAppointments = () => {
    apiFetch(`/api/appointments?userId=${user?.id}&role=${user?.role}`)
      .then(res => res.json())
      .then(setAppointments);
  };

  const fetchContacts = () => {
    apiFetch(`/api/contacts?userId=${user?.id}&role=${user?.role}`)
      .then(res => res.json())
      .then(setContacts);
  };

  const handleBooking = async () => {
    const dateTime = `${selectedDate}T${selectedTime}:00`;
    const payload = user?.role === 'psychologist' 
      ? { psychologistId: user.id, patientId: selectedContact, date: dateTime }
      : { psychologistId: selectedContact, patientId: user?.id, date: dateTime };

    await apiFetch('/api/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    setIsBooking(false);
    resetForm();
    fetchAppointments();
  };

  const resetForm = () => {
    setStep(1);
    setSelectedContact('');
    setSelectedDate('');
    setSelectedTime('');
  };

  // Group appointments by date
  const groupedAppointments = appointments.reduce((acc: any, apt: any) => {
    const date = new Date(apt.date).toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(apt);
    return acc;
  }, {});

  return (
    <div className="max-w-4xl mx-auto space-y-12 py-8 px-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <h1 className="text-4xl font-serif italic text-stone-900 tracking-tight">Minha Agenda</h1>
          <p className="text-stone-500 mt-2 font-serif italic text-lg">Gerencie suas sessões de forma simples e harmoniosa.</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          {user?.role === 'psychologist' && (
            <div className="flex gap-4">
              <button
                onClick={() => setIsConfiguringAvailability(true)}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-stone-200 text-stone-700 rounded-2xl font-bold hover:bg-stone-50 transition-all shadow-sm"
              >
                <Clock className="w-4 h-4" />
                Horários
              </button>
              <button
                onClick={handleConnectGoogle}
                disabled={isGoogleConnected}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all border ${
                  isGoogleConnected 
                    ? 'bg-stone-100 text-stone-500 border-stone-200 cursor-default'
                    : 'bg-white border-stone-200 text-stone-700 hover:bg-stone-50 shadow-sm'
                }`}
              >
                {isGoogleConnected ? (
                  <>
                    <Check className="w-4 h-4" />
                    Sincronizado
                  </>
                ) : (
                  <>
                    <LinkIcon className="w-4 h-4" />
                    Conectar Google
                  </>
                )}
              </button>
            </div>
          )}

          <button 
            onClick={() => setIsBooking(true)}
            className="flex items-center gap-2 px-8 py-4 bg-stone-800 text-white rounded-2xl font-bold hover:bg-stone-700 transition-all shadow-xl shadow-stone-200 transform hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            Novo Agendamento
          </button>
        </div>
      </div>

      <div className="grid gap-10">
        {Object.keys(groupedAppointments).length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[3rem] border border-stone-100 shadow-sm">
            <div className="w-20 h-20 bg-stone-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-stone-200 border border-stone-100">
              <CalendarIcon className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-serif italic text-stone-900">Nenhum agendamento</h3>
            <p className="text-stone-400 font-serif italic text-lg">Sua agenda está livre por enquanto.</p>
          </div>
        ) : (
          Object.entries(groupedAppointments).map(([date, apts]: [string, any]) => (
            <div key={date} className="space-y-6">
              <h3 className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] ml-4">{date}</h3>
              <div className="grid gap-4">
                {apts.map((apt: any) => (
                  <div key={apt.id} className="bg-white p-6 rounded-[2.5rem] border border-stone-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between group">
                    <div className="flex items-center gap-6">
                      <div className="px-5 py-3 bg-stone-50 text-stone-900 rounded-2xl font-serif italic text-xl border border-stone-100">
                        {new Date(apt.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div>
                        <p className="text-2xl font-serif italic text-stone-900">
                          {user?.role === 'psychologist' ? apt.patient_name : apt.psychologist_name}
                        </p>
                        <p className="text-sm text-stone-400 font-serif italic flex items-center gap-2 mt-1">
                          <Video className="w-4 h-4" /> Sessão Online
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="px-4 py-1.5 bg-stone-100 text-stone-500 text-[10px] font-bold uppercase tracking-widest rounded-full border border-stone-200 opacity-0 group-hover:opacity-100 transition-opacity">
                        Confirmado
                      </span>
                      <ChevronRight className="w-6 h-6 text-stone-200 group-hover:text-stone-900 transition-colors" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Booking Modal */}
      <AnimatePresence>
        {isBooking && (
          <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-stone-100"
            >
              <div className="p-8 border-b border-stone-100 flex items-center justify-between bg-stone-50">
                <h2 className="text-2xl font-serif italic text-stone-900">Agendar Sessão</h2>
                <button onClick={() => setIsBooking(false)} className="p-2 hover:bg-stone-100 rounded-full text-stone-400 hover:text-stone-600 transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="p-10">
                {/* Step 1: Select Person */}
                {step === 1 && (
                  <div className="space-y-8">
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-serif italic text-stone-900">Com quem será a sessão?</h3>
                      <p className="text-stone-500 font-serif italic">Selecione o {user?.role === 'psychologist' ? 'paciente' : 'profissional'} para o atendimento.</p>
                    </div>
                    
                    <div className="grid gap-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                      {contacts.map((contact: any) => (
                        <button
                          key={contact.id}
                          onClick={() => { setSelectedContact(contact.id); setStep(2); }}
                          className="flex items-center gap-5 p-5 rounded-[2rem] border border-stone-100 hover:border-stone-900 hover:bg-stone-50 transition-all text-left group"
                        >
                          <img src={contact.avatar} alt="" className="w-14 h-14 rounded-2xl object-cover border border-stone-100" referrerPolicy="no-referrer" />
                          <div className="flex-1">
                            <p className="text-xl font-serif italic text-stone-900 group-hover:text-stone-900">{contact.name}</p>
                            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">{user?.role === 'psychologist' ? 'Paciente' : 'Psicólogo'}</p>
                          </div>
                          <ChevronRight className="w-6 h-6 text-stone-200 group-hover:text-stone-900 transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 2: Select Date & Time */}
                {step === 2 && (
                  <div className="space-y-8">
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-serif italic text-stone-900">Quando será?</h3>
                      <p className="text-stone-500 font-serif italic">Escolha o melhor dia e horário para este encontro.</p>
                    </div>

                    <div className="space-y-10">
                      {/* Visual Date Selector */}
                      <div>
                        <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4 ml-2">Selecione o Dia</label>
                        <div className="flex gap-3 overflow-x-auto pb-4 pr-4 custom-scrollbar -mx-2 px-2">
                          {Array.from({ length: 14 }).map((_, i) => {
                            const d = new Date();
                            d.setDate(d.getDate() + i);
                            const dateStr = d.toISOString().split('T')[0];
                            const isWorkDay = workDays.includes(d.getDay());
                            const isSelected = selectedDate === dateStr;

                            return (
                              <button
                                key={dateStr}
                                onClick={() => {
                                  if (isWorkDay) {
                                    setSelectedDate(dateStr);
                                    setSelectedTime('');
                                  }
                                }}
                                className={`flex-shrink-0 w-20 h-24 rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 ${
                                  isSelected
                                    ? 'bg-stone-900 text-white border-stone-900 shadow-lg shadow-stone-200'
                                    : isWorkDay
                                    ? 'bg-white text-stone-900 border-stone-100 hover:border-stone-400'
                                    : 'bg-stone-50 text-stone-300 border-stone-50 cursor-not-allowed opacity-50'
                                }`}
                              >
                                <span className="text-[10px] font-bold uppercase tracking-widest">
                                  {d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                                </span>
                                <span className="text-2xl font-serif italic">
                                  {d.getDate()}
                                </span>
                                {!isWorkDay && <span className="text-[8px] font-bold uppercase">Folga</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      
                      {selectedDate && (
                        <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4 ml-2">Horários Disponíveis</label>
                          {isLoadingSlots ? (
                            <div className="grid grid-cols-3 gap-3">
                              {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="h-14 bg-stone-50 rounded-xl animate-pulse border border-stone-100" />
                              ))}
                            </div>
                          ) : availableSlots.length > 0 ? (
                            <div className="grid grid-cols-3 gap-3">
                              {availableSlots.map((time) => (
                                <button
                                  key={time}
                                  onClick={() => setSelectedTime(time)}
                                  className={`py-4 rounded-xl font-serif italic text-lg border transition-all ${
                                    selectedTime === time
                                      ? 'bg-stone-900 text-white border-stone-900 shadow-lg shadow-stone-200'
                                      : 'bg-white text-stone-600 border-stone-100 hover:border-stone-900 hover:bg-stone-50'
                                  }`}
                                >
                                  {time}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-12 bg-stone-50 rounded-[2rem] border border-dashed border-stone-200">
                              <p className="text-stone-400 font-serif italic">Nenhum horário disponível para este dia.</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-4 pt-6">
                      <button onClick={() => setStep(1)} className="flex-1 py-4 text-stone-500 font-bold hover:bg-stone-50 rounded-2xl transition-all">
                        Voltar
                      </button>
                      <button 
                        disabled={!selectedDate || !selectedTime}
                        onClick={() => setStep(3)} 
                        className="flex-1 py-4 bg-stone-800 text-white font-bold rounded-2xl hover:bg-stone-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-stone-200"
                      >
                        Continuar
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 3: Confirm */}
                {step === 3 && (
                  <div className="space-y-8">
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-serif italic text-stone-900">Confirmar Agendamento</h3>
                      <p className="text-stone-500 font-serif italic">Revise os detalhes da sua sessão.</p>
                    </div>

                    <div className="bg-stone-50 rounded-[2.5rem] p-8 border border-stone-100 space-y-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-stone-100 rounded-full -mr-16 -mt-16 opacity-50" />
                      
                      <div className="relative space-y-8">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-stone-100">
                            <User className="w-7 h-7 text-stone-400" />
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Paciente</p>
                            <p className="text-xl font-serif italic text-stone-900 leading-none">
                              {contacts.find((c: any) => c.id === selectedContact)?.name || 'Paciente'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-stone-100">
                              <CalendarIcon className="w-7 h-7 text-stone-400" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Data</p>
                              <p className="text-xl font-serif italic text-stone-900 leading-none">
                                {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-5">
                            <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-stone-100">
                              <Clock className="w-7 h-7 text-stone-400" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-1">Horário</p>
                              <p className="text-xl font-serif italic text-stone-900 leading-none">{selectedTime}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button onClick={() => setStep(2)} className="flex-1 py-4 text-stone-500 font-bold hover:bg-stone-50 rounded-2xl transition-all">
                        Voltar
                      </button>
                      <button 
                        onClick={handleBooking} 
                        className="flex-1 py-4 bg-stone-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl shadow-stone-200"
                      >
                        Confirmar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Availability Configuration Modal */}
      <AnimatePresence>
        {isConfiguringAvailability && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setIsConfiguringAvailability(false)}
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8 md:p-12">
                <div className="flex justify-between items-center mb-10">
                  <div>
                    <h2 className="text-3xl font-serif italic text-stone-900">Seus Horários</h2>
                    <p className="text-stone-500 font-serif italic">Configure sua jornada de atendimento semanal.</p>
                  </div>
                  <button 
                    onClick={() => setIsConfiguringAvailability(false)}
                    className="p-3 hover:bg-stone-50 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-stone-400" />
                  </button>
                </div>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((day, index) => {
                    const dayRules = availabilityRules.filter(r => r.day_of_week === index);
                    return (
                      <div key={day} className="p-6 rounded-3xl border border-stone-100 bg-stone-50/50 hover:bg-stone-50 transition-colors">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-serif italic text-xl text-stone-800">{day}</h4>
                          <button 
                            onClick={() => {
                              const newRule = { day_of_week: index, start_time: '08:00', end_time: '18:00' };
                              setAvailabilityRules([...availabilityRules, newRule]);
                            }}
                            className="flex items-center gap-2 text-[10px] font-bold text-stone-400 uppercase tracking-widest hover:text-stone-900 transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Adicionar Turno
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          {dayRules.length > 0 ? dayRules.map((rule, rIndex) => (
                            <div key={rIndex} className="flex items-center gap-4 bg-white p-3 rounded-2xl shadow-sm border border-stone-100">
                              <div className="flex-1 flex items-center gap-3">
                                <input 
                                  type="time" 
                                  value={rule.start_time}
                                  onChange={(e) => {
                                    const newRules = availabilityRules.map(r => r === rule ? { ...r, start_time: e.target.value } : r);
                                    setAvailabilityRules(newRules);
                                  }}
                                  className="flex-1 bg-stone-50 p-2 rounded-xl text-sm font-mono border-none focus:ring-1 focus:ring-stone-200"
                                />
                                <span className="text-stone-300">até</span>
                                <input 
                                  type="time" 
                                  value={rule.end_time}
                                  onChange={(e) => {
                                    const newRules = availabilityRules.map(r => r === rule ? { ...r, end_time: e.target.value } : r);
                                    setAvailabilityRules(newRules);
                                  }}
                                  className="flex-1 bg-stone-50 p-2 rounded-xl text-sm font-mono border-none focus:ring-1 focus:ring-stone-200"
                                />
                              </div>
                              <button 
                                onClick={() => {
                                  const newRules = availabilityRules.filter(r => r !== rule);
                                  setAvailabilityRules(newRules);
                                }}
                                className="p-2 text-stone-300 hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )) : (
                            <p className="text-xs text-stone-400 font-serif italic ml-1">Sem atendimento neste dia.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-10 flex gap-4">
                  <button 
                    onClick={() => setIsConfiguringAvailability(false)}
                    className="flex-1 py-4 text-stone-500 font-bold hover:bg-stone-50 rounded-2xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => handleSaveAvailability(availabilityRules)}
                    className="flex-1 py-4 bg-stone-900 text-white font-bold rounded-2xl hover:bg-black transition-all shadow-xl shadow-stone-200"
                  >
                    Salvar Alterações
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

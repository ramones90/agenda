import React, { useState } from 'react';
import { useAuthStore } from '../store/auth';
import { 
  User, Mail, Phone, Shield, Bell, 
  Calendar, ExternalLink, Save, Camera,
  Lock, Globe, CreditCard
} from 'lucide-react';
import { motion } from 'motion/react';

export default function Profile() {
  const { user } = useAuthStore();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    bio: ''
  });

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    alert('Perfil atualizado com sucesso!');
  };

  const handleGoogleConnect = () => {
    // In a real app, this would trigger the OAuth flow
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="px-4 py-1.5 bg-stone-100 text-stone-500 rounded-full text-[10px] font-bold uppercase tracking-[0.2em] border border-stone-200">
              Sua Conta
            </div>
          </div>
          <h1 className="text-5xl font-serif italic text-stone-900">Configurações</h1>
          <p className="text-stone-500 mt-3 font-serif italic text-lg">Gerencie suas informações e preferências com tranquilidade.</p>
        </div>
        <div className="w-14 h-14 bg-[#E6E7E2] text-stone-900 rounded-2xl flex items-center justify-center shadow-xl shadow-stone-200">
          <User className="w-7 h-7" />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Navigation Sidebar */}
        <aside className="lg:col-span-3 space-y-3">
          {[
            { icon: User, label: 'Informações Pessoais', active: true },
            { icon: Shield, label: 'Segurança' },
            { icon: Bell, label: 'Notificações' },
            { icon: Calendar, label: 'Integrações' },
            { icon: CreditCard, label: 'Faturamento' },
          ].map((item, i) => (
            <button 
              key={i}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all border ${
                item.active 
                  ? 'bg-stone-800 text-white shadow-xl shadow-stone-200 border-stone-800' 
                  : 'text-stone-500 hover:bg-stone-50 border-transparent hover:border-stone-100'
              }`}
            >
              <item.icon className={`w-5 h-5 ${item.active ? 'text-white' : 'text-stone-300'}`} />
              {item.label}
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <div className="lg:col-span-9 space-y-10">
          {/* Profile Header Card */}
          <div className="bg-white p-10 rounded-[3rem] border border-stone-100 shadow-sm flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-48 h-48 bg-stone-50 rounded-full blur-3xl -mr-24 -mt-24 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="relative group z-10">
              <img 
                src={`https://ui-avatars.com/api/?name=${user?.name}&size=128&background=E6E7E2&color=1c1917`} 
                alt="" 
                className="w-32 h-32 rounded-[2rem] object-cover border-4 border-white shadow-xl" 
                referrerPolicy="no-referrer"
              />
              <button className="absolute -bottom-2 -right-2 p-3 bg-stone-800 text-white rounded-2xl shadow-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
                <Camera className="w-4 h-4" />
              </button>
            </div>
            <div className="text-center md:text-left flex-1 z-10">
              <h2 className="text-3xl font-serif italic text-stone-900">{user?.name}</h2>
              <p className="text-stone-500 font-serif italic text-lg">{user?.role === 'patient' ? 'Paciente' : 'Psicólogo'}</p>
              <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
                <span className="px-4 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-bold uppercase tracking-widest border border-emerald-100">Verificado</span>
                <span className="px-4 py-1.5 bg-stone-50 text-stone-500 rounded-full text-[10px] font-bold uppercase tracking-widest border border-stone-100">Membro desde 2024</span>
              </div>
            </div>
          </div>

          {/* Form Section */}
          <div className="bg-white p-12 rounded-[3rem] border border-stone-100 shadow-sm space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] ml-2">Nome Completo</label>
                <div className="relative group">
                  <User className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
                  <input 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full pl-16 pr-6 py-5 bg-stone-50 border border-stone-100 rounded-[2rem] focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all font-serif italic text-lg text-stone-800"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] ml-2">E-mail</label>
                <div className="relative">
                  <Mail className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300" />
                  <input 
                    type="email" 
                    value={formData.email}
                    disabled
                    className="w-full pl-16 pr-6 py-5 bg-stone-100 border border-stone-100 rounded-[2rem] text-stone-400 cursor-not-allowed font-serif italic text-lg"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] ml-2">Telefone</label>
                <div className="relative group">
                  <Phone className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
                  <input 
                    type="tel" 
                    placeholder="(11) 99999-9999"
                    className="w-full pl-16 pr-6 py-5 bg-stone-50 border border-stone-100 rounded-[2rem] focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all font-serif italic text-lg text-stone-800"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] ml-2">Idioma Preferencial</label>
                <div className="relative group">
                  <Globe className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300 group-focus-within:text-stone-900 transition-colors" />
                  <select className="w-full pl-16 pr-12 py-5 bg-stone-50 border border-stone-100 rounded-[2rem] focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all appearance-none cursor-pointer font-serif italic text-lg text-stone-800">
                    <option>Português (Brasil)</option>
                    <option>English</option>
                    <option>Español</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-bold text-stone-400 uppercase tracking-[0.2em] ml-2">Bio / Sobre Você</label>
              <textarea 
                placeholder="Conte um pouco sobre você..."
                className="w-full h-40 p-8 bg-stone-50 border border-stone-100 rounded-[3rem] focus:bg-white focus:ring-4 focus:ring-stone-100 focus:border-stone-200 outline-none transition-all resize-none font-serif italic text-lg text-stone-800 leading-relaxed"
              />
            </div>

            <div className="pt-6 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="px-12 py-5 bg-stone-800 text-white rounded-[2rem] font-bold hover:bg-stone-700 transition-all flex items-center gap-3 shadow-xl shadow-stone-200 disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                {isSaving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>

          {/* Integrations Section */}
          <div className="bg-white p-12 rounded-[3rem] border border-stone-100 shadow-sm space-y-10">
            <div>
              <h3 className="text-2xl font-serif italic text-stone-900">Integrações</h3>
              <p className="text-stone-500 font-serif italic text-lg mt-1">Conecte suas ferramentas favoritas para uma melhor experiência.</p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row items-center justify-between p-8 bg-stone-50 rounded-[2.5rem] border border-stone-100 gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-stone-100">
                    <Globe className="w-8 h-8 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xl font-serif italic text-stone-900">Google Calendar</p>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1">Sincronize suas sessões com sua agenda pessoal.</p>
                  </div>
                </div>
                <button 
                  onClick={handleGoogleConnect}
                  className="px-8 py-4 bg-white border border-stone-200 rounded-2xl text-sm font-bold text-stone-700 hover:bg-stone-50 transition-all flex items-center gap-2 shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Conectar
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="bg-rose-50 p-12 rounded-[3rem] border border-rose-100 space-y-8">
            <div>
              <h3 className="text-2xl font-serif italic text-rose-900">Zona de Perigo</h3>
              <p className="text-rose-700 font-serif italic text-lg mt-1">Ações irreversíveis relacionadas à sua conta.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <button className="px-8 py-4 bg-white border border-rose-200 text-rose-600 rounded-2xl text-sm font-bold hover:bg-rose-100 transition-all flex items-center gap-2 shadow-sm">
                <Lock className="w-4 h-4" />
                Alterar Senha
              </button>
              <button className="px-8 py-4 bg-rose-600 text-white rounded-2xl text-sm font-bold hover:bg-rose-700 transition-all shadow-lg shadow-rose-200">
                Excluir Minha Conta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

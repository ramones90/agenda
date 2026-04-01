import { useAuthStore } from '../store/auth';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  MessageSquare, 
  Settings, 
  LogOut,
  Activity,
  BookOpen,
  User,
  ClipboardList
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  role: 'psychologist' | 'patient' | 'admin';
}

export function Sidebar({ role }: SidebarProps) {
  const { logout, user } = useAuthStore();

  const links = role === 'psychologist' ? [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dashboard/patients', icon: Users, label: 'Pacientes' },
    { to: '/dashboard/calendar', icon: Calendar, label: 'Agenda' },
    { to: '/dashboard/questionnaires', icon: ClipboardList, label: 'Questionários' },
    { to: '/dashboard/messages', icon: MessageSquare, label: 'Mensagens' },
    { to: '/dashboard/profile', icon: User, label: 'Perfil' },
  ] : role === 'admin' ? [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
    { to: '/dashboard/users', icon: Users, label: 'Usuários' },
    { to: '/dashboard/settings', icon: Settings, label: 'Configurações' },
    { to: '/dashboard/profile', icon: User, label: 'Perfil' },
  ] : [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Meu Espaço' },
    { to: '/dashboard/journal', icon: BookOpen, label: 'Diário' },
    { to: '/dashboard/calendar', icon: Calendar, label: 'Agenda' },
    { to: '/dashboard/progress', icon: Activity, label: 'Progresso' },
    { to: '/dashboard/profile', icon: User, label: 'Perfil' },
  ];

  return (
    <aside className="w-72 bg-[#FDFDFB] border-r border-stone-200 flex flex-col">
      <div className="p-8 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-stone-800 rounded-full flex items-center justify-center text-white font-serif italic text-xl">
            Ψ
          </div>
          <span className="font-serif italic text-2xl text-stone-900 tracking-tight">PsiConnect</span>
        </div>
      </div>

      <div className="p-8 flex items-center gap-4 border-b border-stone-100">
        <div className="relative">
          <img 
            src={user?.avatar} 
            alt={user?.name} 
            className="w-12 h-12 rounded-full object-cover border border-stone-200" 
            referrerPolicy="no-referrer" 
          />
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-stone-900 truncate">{user?.name}</p>
          <p className="text-[10px] uppercase tracking-widest text-stone-400 font-bold">
            {role === 'psychologist' ? 'Psicólogo(a)' : role === 'admin' ? 'Administrador' : 'Paciente'}
          </p>
        </div>
      </div>

      <nav className="flex-1 p-6 space-y-2">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) => clsx(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
              isActive 
                ? "bg-stone-800 text-white shadow-lg shadow-stone-800/10" 
                : "text-stone-500 hover:bg-stone-50 hover:text-stone-900"
            )}
          >
            {({ isActive }) => (
              <>
                <link.icon className={clsx("w-5 h-5", isActive ? "text-white" : "text-stone-400")} />
                {link.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-6 border-t border-stone-100">
        <button 
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-xl text-sm font-medium text-stone-400 hover:bg-rose-50 hover:text-rose-600 transition-all duration-200"
        >
          <LogOut className="w-5 h-5" />
          Sair
        </button>
      </div>
    </aside>
  );
}

import { useAuthStore } from '../store/auth';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { motion } from 'motion/react';

export function Layout() {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden">
      <Sidebar role={user.role} />
      <main className="flex-1 overflow-y-auto p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          key={location.pathname}
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  );
}

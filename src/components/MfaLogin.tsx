import React, { useState } from 'react';
import { Shield, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuthStore } from '../store/auth';

interface MfaLoginProps {
  userId: string;
  onSuccess: () => void;
}

export const MfaLogin: React.FC<MfaLoginProps> = ({ userId, onSuccess }) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { validateMfa } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await validateMfa(userId, code);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Código inválido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl border border-indigo-50 max-w-md w-full">
      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Verificação em Duas Etapas</h2>
        <p className="text-gray-500 text-center mt-2">
          Insira o código de 6 dígitos gerado pelo seu aplicativo de autenticação.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Código de Verificação
          </label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-center text-2xl tracking-widest font-mono"
            required
          />
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </motion.div>
        )}

        <button
          type="submit"
          disabled={loading || code.length !== 6}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Shield className="w-5 h-5" />
              Verificar e Entrar
            </>
          )}
        </button>
      </form>
    </div>
  );
};

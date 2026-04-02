import React, { useState } from 'react';
import { Shield, Loader2, AlertCircle, CheckCircle2, QrCode } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { apiFetch } from '../lib/api';

export const MfaSetup: React.FC = () => {
  const [step, setStep] = useState<'initial' | 'setup' | 'verify' | 'success'>('initial');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState('');

  const startSetup = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/mfa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setQrCodeUrl(data.qrCodeUrl);
      setSecret(data.secret);
      setStep('setup');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const verifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch('/api/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error);
      }
      setStep('success');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-indigo-50 shadow-sm">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
          <Shield className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">Autenticação em Duas Etapas (MFA)</h3>
          <p className="text-gray-500 text-sm">Adicione uma camada extra de segurança à sua conta profissional.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'initial' && (
          <motion.div
            key="initial"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <p className="text-gray-600 mb-6 leading-relaxed">
              O MFA protege sua conta exigindo um código temporário gerado no seu celular, além da sua senha. 
              Recomendado para todos os psicólogos e administradores.
            </p>
            <button
              onClick={startSetup}
              disabled={loading}
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Shield className="w-5 h-5" />}
              Configurar Agora
            </button>
          </motion.div>
        )}

        {step === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row gap-8 items-center">
              {qrCodeUrl && (
                <div className="p-4 bg-white border-2 border-indigo-100 rounded-2xl shadow-inner">
                  <img src={qrCodeUrl} alt="QR Code MFA" className="w-48 h-48" />
                </div>
              )}
              <div className="flex-1 space-y-4">
                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-indigo-600" />
                  1. Escaneie o QR Code
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Use um aplicativo como <strong>Google Authenticator</strong> ou <strong>Authy</strong> no seu celular para escanear este código.
                </p>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Chave Manual</p>
                  <code className="text-indigo-600 font-mono font-bold break-all">{secret}</code>
                </div>
              </div>
            </div>
            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setStep('verify')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all"
              >
                Próximo Passo
              </button>
            </div>
          </motion.div>
        )}

        {step === 'verify' && (
          <motion.div
            key="verify"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <h4 className="font-bold text-gray-900 mb-4">2. Verifique o Código</h4>
            <p className="text-sm text-gray-600 mb-6">
              Insira o código de 6 dígitos que aparece no seu aplicativo para confirmar a configuração.
            </p>
            <form onSubmit={verifyMfa} className="space-y-6">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                className="w-full px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-center text-3xl tracking-[0.5em] font-mono"
                required
              />
              {error && (
                <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-sm flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              )}
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setStep('setup')}
                  className="text-gray-500 font-bold hover:text-gray-700"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-indigo-300 transition-all flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-5 h-5 animate-spin" />}
                  Ativar MFA
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center text-center py-4"
          >
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-600" />
            </div>
            <h4 className="text-2xl font-bold text-gray-900 mb-2">MFA Ativado com Sucesso!</h4>
            <p className="text-gray-500 max-w-xs">
              Sua conta agora está protegida com autenticação em duas etapas.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

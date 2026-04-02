import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmLabel = 'Confirmar', 
  cancelLabel = 'Cancelar' 
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl"
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                <AlertCircle className="w-6 h-6" />
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-stone-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            <h3 className="text-2xl font-serif italic text-stone-900 mb-2">{title}</h3>
            <p className="text-stone-600 mb-8 leading-relaxed">{message}</p>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-4 rounded-2xl border border-stone-200 text-stone-600 font-medium hover:bg-stone-50 transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className="flex-1 px-6 py-4 rounded-2xl bg-stone-900 text-white font-medium hover:bg-stone-800 transition-colors shadow-lg shadow-stone-200"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

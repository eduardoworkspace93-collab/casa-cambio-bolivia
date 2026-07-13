import { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

export default function Toast({ message, type, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="fixed top-4 left-4 right-4 z-50 flex justify-center pointer-events-none"
    >
      <div
        className={`w-full max-w-md pointer-events-auto flex items-center justify-between p-5 rounded-2xl shadow-xl border-2 ${
          type === 'success'
            ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
            : 'bg-rose-50 border-rose-500 text-rose-950'
        }`}
      >
        <div className="flex items-center gap-4">
          {type === 'success' ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-rose-600 shrink-0" />
          )}
          <span className="text-lg font-semibold tracking-wide leading-tight">
            {message}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-black/5 active:bg-black/10 rounded-full transition-colors shrink-0"
          aria-label="Cerrar notificación"
        >
          <X className="w-6 h-6 opacity-70" />
        </button>
      </div>
    </motion.div>
  );
}

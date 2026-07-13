import { AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Sí, eliminar',
  cancelText = 'No, cancelar',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onCancel}
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border-2 border-slate-200 overflow-hidden z-10"
        >
          <div className="flex flex-col items-center text-center">
            {/* Alert Icon */}
            <div className="w-16 h-16 bg-rose-50 border-2 border-rose-200 text-rose-600 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="w-9 h-9" />
            </div>

            {/* Title */}
            <h3 className="text-2xl font-bold text-slate-900 mb-2 leading-tight">
              {title}
            </h3>

            {/* Message */}
            <p className="text-slate-600 text-lg mb-6 leading-relaxed">
              {message}
            </p>

            {/* Big Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={onConfirm}
                className="w-full py-4 px-6 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-lg rounded-2xl transition-colors shadow-lg shadow-rose-600/10 active:scale-[0.98]"
              >
                {confirmText}
              </button>
              <button
                onClick={onCancel}
                className="w-full py-4 px-6 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold text-lg rounded-2xl transition-colors active:scale-[0.98]"
              >
                {cancelText}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

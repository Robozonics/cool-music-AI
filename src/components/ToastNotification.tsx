import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X, Cloud } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'sync';
  message: string;
  duration?: number;
}

let toastListeners: ((toast: Toast) => void)[] = [];
let toastIdCounter = 0;

export const showToast = (type: Toast['type'], message: string, duration = 3000) => {
  const toast: Toast = { id: `toast-${++toastIdCounter}`, type, message, duration };
  toastListeners.forEach(fn => fn(toast));
};
(window as any).showToast = showToast;

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Toast) => {
    setToasts(prev => [...prev.slice(-4), toast]); // max 5 visible
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  useEffect(() => {
    toastListeners.push(addToast);
    return () => {
      toastListeners = toastListeners.filter(fn => fn !== addToast);
    };
  }, [addToast]);

  useEffect(() => {
    toasts.forEach(toast => {
      const timer = setTimeout(() => removeToast(toast.id), toast.duration || 3000);
      return () => clearTimeout(timer);
    });
  }, [toasts, removeToast]);

  const getIcon = (type: Toast['type']) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'error': return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'sync': return <Cloud className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />;
      default: return <Info className="w-4 h-4 text-blue-400 shrink-0" />;
    }
  };

  const getBg = (type: Toast['type']) => {
    switch (type) {
      case 'success': return 'bg-emerald-500/10 border-emerald-500/30';
      case 'error': return 'bg-rose-500/10 border-rose-500/30';
      case 'sync': return 'bg-cyan-500/10 border-cyan-500/30';
      default: return 'bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 80, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 80, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', damping: 22, stiffness: 300 }}
            className={`pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border backdrop-blur-xl shadow-2xl ${getBg(toast.type)}`}
          >
            {getIcon(toast.type)}
            <span className="text-xs font-bold text-white flex-1">{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} className="text-gray-500 hover:text-white transition p-0.5">
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};


import React, { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const styles = {
    success: 'bg-emerald-500 border-emerald-400 text-black',
    error: 'bg-rose-500 border-rose-400 text-white',
    warning: 'bg-yellow-500 border-yellow-400 text-black',
    info: 'bg-zinc-800 border-zinc-700 text-white'
  };

  const icons = {
    success: 'fa-circle-check',
    error: 'fa-circle-xmark',
    warning: 'fa-triangle-exclamation',
    info: 'fa-circle-info'
  };

  return (
    <div className={`fixed bottom-8 right-8 z-[100] flex items-center gap-4 px-6 py-4 rounded-2xl border-2 shadow-2xl animate-in slide-in-from-right-10 duration-300 ${styles[type]}`}>
      <i className={`fa-solid ${icons[type]} text-xl`}></i>
      <div className="flex flex-col">
        <p className="font-black uppercase italic text-[10px] tracking-widest opacity-70 leading-none mb-1">Notificação</p>
        <p className="font-bold text-sm tracking-tight">{message}</p>
      </div>
      <button onClick={onClose} className="ml-4 opacity-50 hover:opacity-100 transition-opacity">
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  );
};

export default Toast;

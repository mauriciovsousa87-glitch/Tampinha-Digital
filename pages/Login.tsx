
import React, { useState } from 'react';
import { User } from '../types';
import { ToastType } from '../components/Toast';

interface LoginProps {
  onLogin: (u: User) => void;
  onGoToRegister: () => void;
  db: any;
  onRefreshDB: () => void;
  showToast: (msg: string, type: ToastType) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onGoToRegister, db, onRefreshDB, showToast }) => {
  const [corporateId, setCorporateId] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onRefreshDB();
    const user = db.users.find((u: User) => u.corporateId === corporateId && u.passwordHash === password);
    if (user) {
      onLogin(user);
    } else {
      showToast('ID Corporativo ou Senha inválidos!', 'error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-yellow-500/5 blur-[120px] rounded-full"></div>
      
      <div className="w-full max-w-md bg-zinc-900/40 backdrop-blur-xl border border-zinc-800 rounded-[3rem] shadow-2xl overflow-hidden p-10 animate-in fade-in zoom-in duration-500 relative z-10">
        <div className="text-center mb-12 flex flex-col items-center">
          <div className="tampinha-container mb-8">
            <div className="tampinha-serrilha"></div>
            <div className="tampinha-fundo-preto">
              <span className="text-supply">SUPPLY</span>
              <div className="logo-line"></div>
              <span className="text-nada-nos-para">Nada nos para!</span>
            </div>
          </div>
          <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-1">Acesso ao Sistema</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">ID Corporativo</label>
            <div className="relative">
              <i className="fa-solid fa-user absolute left-5 top-4 text-zinc-600"></i>
              <input 
                type="text" 
                required
                className="w-full pl-14 pr-6 py-4 bg-black border border-zinc-800 text-white rounded-2xl focus:outline-none focus:border-yellow-500 transition-all placeholder:text-zinc-800 font-bold"
                placeholder="ID de Colaborador"
                value={corporateId}
                onChange={e => setCorporateId(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest ml-1">Senha</label>
            <div className="relative">
              <i className="fa-solid fa-lock absolute left-5 top-4 text-zinc-600"></i>
              <input 
                type="password" 
                required
                className="w-full pl-14 pr-6 py-4 bg-black border border-zinc-800 text-white rounded-2xl focus:outline-none focus:border-yellow-500 transition-all placeholder:text-zinc-800 font-bold"
                placeholder="••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-yellow-500 text-black py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-yellow-400 transition-all active:scale-[0.98] shadow-lg shadow-yellow-500/20"
          >
            Entrar
          </button>
        </form>

        <div className="mt-10 pt-8 border-t border-zinc-800 text-center">
          <p className="text-zinc-500 text-sm font-medium">
            Primeiro acesso?{' '}
            <button 
              onClick={onGoToRegister}
              className="text-white font-black hover:text-yellow-500 transition-colors"
            >
              Crie sua conta
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

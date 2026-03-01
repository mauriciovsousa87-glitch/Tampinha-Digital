
import React, { useState } from 'react';
import { UserStatus, Role, Capability } from '../types';
import { saveDB } from '../store';
import { ToastType } from '../components/Toast';

interface RegisterProps {
  onGoToLogin: () => void;
  db: any;
  onRefreshDB: () => void;
  showToast: (msg: string, type: ToastType) => void;
}

const Register: React.FC<RegisterProps> = ({ onGoToLogin, db, onRefreshDB, showToast }) => {
  const [formData, setFormData] = useState({
    corporateId: '',
    name: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      showToast('As senhas digitadas não coincidem.', 'error');
      return;
    }

    if (db.users.some((u: any) => u.corporateId === formData.corporateId)) {
      showToast('Este ID Corporativo já possui uma conta cadastrada.', 'warning');
      return;
    }

    const newUser = {
      id: Math.random().toString(36).substr(2, 9),
      corporateId: formData.corporateId,
      name: formData.name,
      passwordHash: formData.password,
      status: UserStatus.PENDING,
      roles: [Role.USER],
      capabilities: [Capability.RECEIVE_ONLY],
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    /* Fix: Initializing wallet with all required fields from types.ts */
    db.wallets.push({ 
      userId: newUser.id, 
      balance: 0, 
      donatableGold: 0, 
      donatableSilver: 0, 
      donatableBronze: 0 
    });
    
    saveDB(db);
    onRefreshDB();
    showToast('Cadastro realizado! Aguarde aprovação do Admin.', 'success');
    onGoToLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-yellow-500/5 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-md bg-white border border-zinc-200 rounded-[3rem] shadow-2xl overflow-hidden p-10 animate-in fade-in zoom-in duration-500 relative z-10">
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full border border-yellow-500 flex flex-col items-center justify-center bg-white mb-4 shadow-sm">
            <span className="text-yellow-500 font-black italic text-[9px] leading-none">SUPPLY</span>
            <div className="w-6 h-[1px] bg-zinc-200 my-0.5"></div>
          </div>
          <h2 className="text-2xl font-black text-zinc-900 italic uppercase tracking-tighter">Criar nova conta</h2>
          <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-1">Preencha seus dados para começar.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Nome Completo</label>
            <input 
              type="text" required
              className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-2xl focus:outline-none focus:border-yellow-500 transition-all font-bold"
              placeholder="Digite seu nome"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">ID Corporativo</label>
            <input 
              type="text" required
              className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-2xl focus:outline-none focus:border-yellow-500 transition-all font-bold"
              placeholder="Ex: 99768009"
              value={formData.corporateId}
              onChange={e => setFormData({...formData, corporateId: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Senha</label>
            <input 
              type="password" required
              className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-2xl focus:outline-none focus:border-yellow-500 transition-all font-bold"
              placeholder="••••"
              value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
            />
          </div>
          <div className="space-y-1">
            <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
            <input 
              type="password" required
              className="w-full px-5 py-3.5 bg-zinc-50 border border-zinc-200 text-zinc-900 rounded-2xl focus:outline-none focus:border-yellow-500 transition-all font-bold"
              placeholder="••••"
              value={formData.confirmPassword}
              onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-yellow-500 text-black py-4 rounded-2xl font-black text-base uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-lg shadow-yellow-500/10 mt-6 active:scale-[0.98]"
          >
            Finalizar Cadastro
          </button>
        </form>

        <button 
          onClick={onGoToLogin}
          className="w-full mt-6 text-zinc-400 font-bold text-xs uppercase tracking-widest hover:text-zinc-900 transition-colors"
        >
          Voltar para o Login
        </button>
      </div>
    </div>
  );
};

export default Register;
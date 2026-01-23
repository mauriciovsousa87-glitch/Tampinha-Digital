
import React from 'react';
import { User, Wallet } from '../types';

interface TopbarProps {
  user: User | null;
  wallet: Wallet;
  onLogout: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ user, wallet, onLogout }) => {
  return (
    <header className="h-20 border-b border-zinc-800 bg-black px-4 md:px-8 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-black text-yellow-500 uppercase italic md:hidden tracking-tighter">SUPPLY</h2>
      </div>

      <div className="flex items-center gap-2 md:gap-4 overflow-x-auto no-scrollbar py-2">
        {/* CARTEIRA DE DOAÇÃO (VERBA) */}
        <div className="flex items-center gap-1.5 mr-2">
          <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest vertical-text mr-1">Verba de Doação:</span>
          
          <div className="flex items-center gap-2 bg-yellow-500/10 text-yellow-500 px-3 py-1.5 rounded-full border border-yellow-500/20 whitespace-nowrap">
            <i className="fa-solid fa-hand-holding-dollar text-[10px]"></i>
            <span className="font-black text-sm">{wallet.donatableGold || 0}</span>
            <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Ouro</span>
          </div>
          
          <div className="flex items-center gap-2 bg-zinc-400/10 text-zinc-300 px-3 py-1.5 rounded-full border border-zinc-400/20 whitespace-nowrap">
            <i className="fa-solid fa-hand-holding-dollar text-[10px]"></i>
            <span className="font-black text-sm">{wallet.donatableSilver || 0}</span>
            <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Prata</span>
          </div>

          <div className="flex items-center gap-2 bg-orange-700/10 text-orange-500 px-3 py-1.5 rounded-full border border-orange-700/20 whitespace-nowrap">
            <i className="fa-solid fa-hand-holding-dollar text-[10px]"></i>
            <span className="font-black text-sm">{wallet.donatableBronze || 0}</span>
            <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Bronze</span>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-zinc-800 mx-2 hidden md:block"></div>

        {/* SALDO PESSOAL (PARA COMPRAS) */}
        <div className="flex items-center gap-2 bg-white/5 text-white px-4 py-1.5 rounded-full border border-white/10 whitespace-nowrap shadow-lg">
          <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Meu Saldo (Compras):</span>
          <span className="font-black text-lg leading-none italic">{wallet.balance || 0}</span>
          <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Pontos</span>
        </div>
      </div>

      <div className="flex items-center gap-3 pl-4 border-l border-zinc-800 ml-4">
        <div className="hidden md:block text-right min-w-max">
          <p className="text-xs font-black text-white leading-tight uppercase italic">{user?.name}</p>
          <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Matrícula: {user?.corporateId}</p>
        </div>
        <button 
          onClick={onLogout}
          title="Sair do sistema"
          className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center hover:bg-rose-500 hover:text-white text-zinc-500 transition-all active:scale-95"
        >
          <i className="fa-solid fa-power-off"></i>
        </button>
      </div>
    </header>
  );
};

export default Topbar;

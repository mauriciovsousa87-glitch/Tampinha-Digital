
import React from 'react';
import { User, Wallet } from '../types';

interface TopbarProps {
  user: User | null;
  wallet: Wallet;
  onLogout: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ user, wallet, onLogout }) => {
  return (
    <header className="h-20 border-b border-zinc-200 bg-white px-4 md:px-8 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="text-sm font-black text-yellow-500 uppercase italic md:hidden tracking-tighter">SUPPLY</h2>
      </div>

      <div className="flex items-center gap-2 md:gap-4 overflow-x-auto no-scrollbar py-2">
        {/* CARTEIRA DE DOAÇÃO (VERBA) */}
        <div className="flex items-center gap-1.5 mr-2">
          <span className="text-[7px] font-black text-zinc-400 uppercase tracking-widest vertical-text mr-1">Verba de Doação:</span>
          
          <div className="flex items-center gap-2 bg-yellow-50 text-yellow-600 px-3 py-1.5 rounded-full border border-yellow-200 whitespace-nowrap">
            <i className="fa-solid fa-hand-holding-dollar text-[10px]"></i>
            <span className="font-black text-sm">{wallet.donatableGold || 0}</span>
            <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Ouro</span>
          </div>
          
          <div className="flex items-center gap-2 bg-zinc-100 text-zinc-600 px-3 py-1.5 rounded-full border border-zinc-200 whitespace-nowrap">
            <i className="fa-solid fa-hand-holding-dollar text-[10px]"></i>
            <span className="font-black text-sm">{wallet.donatableSilver || 0}</span>
            <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Prata</span>
          </div>

          <div className="flex items-center gap-2 bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full border border-orange-200 whitespace-nowrap">
            <i className="fa-solid fa-hand-holding-dollar text-[10px]"></i>
            <span className="font-black text-sm">{wallet.donatableBronze || 0}</span>
            <span className="text-[7px] font-black uppercase tracking-widest opacity-60">Bronze</span>
          </div>
        </div>

        <div className="h-6 w-[1px] bg-zinc-200 mx-2 hidden md:block"></div>

        {/* SALDO PESSOAL (PARA COMPRAS) */}
        <div className="flex items-center gap-2 bg-zinc-50 text-zinc-800 px-4 py-1.5 rounded-full border border-zinc-200 whitespace-nowrap shadow-sm">
          <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Meu Saldo (Compras):</span>
          <span className="font-black text-lg leading-none italic">{wallet.balance || 0}</span>
          <span className="text-[8px] font-black uppercase tracking-widest opacity-50">Pontos</span>
        </div>
      </div>

      <div className="flex items-center gap-3 pl-4 border-l border-zinc-200 ml-4">
        <div className="hidden md:block text-right min-w-max">
          <p className="text-xs font-black text-zinc-900 leading-tight uppercase italic">{user?.name}</p>
          <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">Matrícula: {user?.corporateId}</p>
        </div>
        <button 
          onClick={onLogout}
          title="Sair do sistema"
          className="w-10 h-10 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-center hover:bg-rose-50 hover:text-white hover:border-rose-500 text-zinc-400 transition-all active:scale-95"
        >
          <i className="fa-solid fa-power-off"></i>
        </button>
      </div>
    </header>
  );
};

export default Topbar;

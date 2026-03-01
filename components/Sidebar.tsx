
import React from 'react';
import { Capability } from '../types';

interface SidebarProps {
  currentView: string;
  setView: (v: any) => void;
  capabilities: Capability[];
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, capabilities }) => {
  const isLider = capabilities.some(c => [
    Capability.SUPERVISOR_COORDENADOR, 
    Capability.GERENTE_AREA, 
    Capability.GERENTE_FABRIL, 
    Capability.GENTE_GESTAO,
    Capability.LEADERSHIP
  ].includes(c)) || capabilities.includes(Capability.ADMIN);

  const isAprovador = capabilities.some(c => [
    Capability.GENTE_GESTAO,
    Capability.APPROVE_PURCHASES
  ].includes(c)) || capabilities.includes(Capability.ADMIN);

  const isAdmin = capabilities.includes(Capability.ADMIN);

  const menuItems = [
    { id: 'DASHBOARD', label: 'Início', icon: 'fa-house', visible: true },
    { id: 'STORE', label: 'Loja de Brindes', icon: 'fa-shop', visible: true },
    { id: 'MY_ORDERS', label: 'Meus Pedidos', icon: 'fa-list-check', visible: true },
    { id: 'LEADERSHIP', label: 'Dar Moedas', icon: 'fa-hand-holding-heart', visible: isLider },
    { id: 'APPROVALS', label: 'Aprovações', icon: 'fa-stamp', visible: isAprovador },
    { id: 'ADMIN', label: 'Administração', icon: 'fa-gears', visible: isAdmin },
  ];

  return (
    <aside className="w-20 md:w-64 bg-white border-r border-zinc-200 text-zinc-800 flex flex-col transition-all duration-300 shadow-sm">
      <div className="p-6 flex flex-col items-center md:items-start">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full border border-yellow-500 flex flex-col items-center justify-center bg-white shadow-sm">
            <span className="text-yellow-500 font-black italic text-[8px] leading-none">SUPPLY</span>
            <div className="w-6 h-[1px] bg-zinc-200 my-0.5"></div>
          </div>
          <div className="hidden md:block">
            <h1 className="font-black text-xl leading-none text-zinc-900 uppercase tracking-tighter italic">SUPPLY</h1>
            <p className="text-[9px] text-zinc-400 font-bold tracking-widest uppercase">Nada nos para!</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-2">
        {menuItems.filter(item => item.visible).map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-4 p-3 rounded-xl transition-all ${
              currentView === item.id 
              ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' 
              : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'
            }`}
          >
            <i className={`fa-solid ${item.icon} w-6 text-center text-lg`}></i>
            <span className="hidden md:block font-black uppercase text-[10px] tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-100">
        <div className="hidden md:block p-3 bg-zinc-50 rounded-xl text-[9px] text-zinc-400 uppercase font-black text-center">
          <p>© 2024 SUPPLY DIGITAL</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

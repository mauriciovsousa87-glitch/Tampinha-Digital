
import React, { useMemo } from 'react';
import { User, Transaction, TransactionType, Capability, Wallet, CoinType, PilarType } from '../types';

interface DashboardProps { user: User; db: any; setView: (v: any) => void; }

const PILARES: PilarType[] = [
  'Segurança', 'Qualidade', 'Manutenção', 'Financeiro', 
  'Logística', 'Meio Ambiente', 'Gestão', 'Gente'
];

const Dashboard: React.FC<DashboardProps> = ({ user, db, setView }) => {
  const wallet: Wallet = db.wallets.find((w: any) => w.userId === user.id) || { 
    balance: 0, 
    donatableGold: 0, 
    donatableSilver: 0, 
    donatableBronze: 0 
  };

  const isLeader = user.capabilities.some(c => [
    Capability.SUPERVISOR_COORDENADOR, 
    Capability.GERENTE_AREA, 
    Capability.GERENTE_FABRIL, 
    Capability.GENTE_GESTAO,
    Capability.ADMIN
  ].includes(c));

  // Matriz Pilar x Moeda - CORRIGIDA LÓGICA DE CONTAGEM
  const pilarStats = useMemo(() => {
    const stats: Record<string, Record<CoinType, number>> = {};
    PILARES.forEach(p => {
      stats[p] = { [CoinType.BRONZE]: 0, [CoinType.SILVER]: 0, [CoinType.GOLD]: 0 };
    });

    (db.transactions || []).forEach((t: Transaction) => {
      if (t.toUserId === user.id && t.type === TransactionType.CREDIT && t.pillar && t.coinType) {
        if (!stats[t.pillar]) stats[t.pillar] = { [CoinType.BRONZE]: 0, [CoinType.SILVER]: 0, [CoinType.GOLD]: 0 };
        
        // Se a transação tem coinCount salvo, usa ele. Caso contrário deriva do amount/weight
        let count = t.coinCount || 0;
        if (!count && t.amount) {
           const weight = t.coinType === CoinType.GOLD ? 3 : t.coinType === CoinType.SILVER ? 2 : 1;
           count = t.amount / weight;
        }
        stats[t.pillar][t.coinType] += count;
      }
    });

    return stats;
  }, [db.transactions, user.id]);

  const totalDonatablePoints = useMemo(() => {
    const gold = (wallet.donatableGold || 0) * 3;
    const silver = (wallet.donatableSilver || 0) * 2;
    const bronze = (wallet.donatableBronze || 0) * 1;
    return gold + silver + bronze;
  }, [wallet]);

  const userTransactions = (db.transactions || [])
    .filter((t: Transaction) => t.toUserId === user.id || t.fromUserId === user.id)
    .sort((a: Transaction, b: Transaction) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);
    
  const pendingOrders = (db.orders || []).filter((o: any) => o.userId === user.id && o.status === 'PENDING').length;

  const totalMoedasRecebidas = useMemo(() => {
    return (db.transactions || [])
      .filter((t: Transaction) => t.toUserId === user.id && t.type === TransactionType.CREDIT && !t.isDonationVerba && t.coinType)
      .reduce((acc: number, t: Transaction) => {
        let count = t.coinCount || 0;
        if (!count && t.amount) {
           const weight = t.coinType === CoinType.GOLD ? 3 : t.coinType === CoinType.SILVER ? 2 : 1;
           count = t.amount / weight;
        }
        return acc + count;
      }, 0);
  }, [db.transactions, user.id]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 flex items-center justify-center">
            <div className="absolute inset-0 bg-yellow-500" style={{ clipPath: 'polygon(50% 0%, 55% 2%, 60% 0%, 65% 5%, 72% 3%, 76% 9%, 84% 9%, 87% 16%, 93% 19%, 93% 27%, 99% 32%, 97% 40%, 100% 50%, 97% 60%, 99% 68%, 93% 73%, 93% 81%, 87% 84%, 84% 91%, 76% 91%, 72% 97%, 65% 95%, 60% 100%, 55% 98%, 50% 100%, 45% 98%, 40% 100%, 35% 95%, 28% 97%, 24% 91%, 16% 91%, 13% 84%, 7% 81%, 7% 73%, 1% 68%, 3% 60%, 0% 50%, 3% 40%, 1% 32%, 7% 27%, 7% 19%, 13% 16%, 16% 9%, 24% 9%, 28% 3%, 35% 5%, 40% 0%, 45% 2%)' }}></div>
            <div className="absolute w-[88%] h-[88%] bg-white rounded-full z-10 flex flex-col items-center justify-center shadow-sm">
              <span className="text-yellow-500 font-black italic text-[14px] leading-none">SUPPLY</span>
              <div className="w-10 h-[1px] bg-zinc-200 my-1"></div>
              <span className="text-zinc-400 font-bold text-[6px] uppercase whitespace-nowrap">Nada nos para!</span>
            </div>
          </div>
          <div>
            <p className="text-zinc-400 font-black uppercase tracking-[0.3em] text-[10px] mb-1 opacity-50 italic">Nada nos para!</p>
            <h1 className="text-4xl font-black text-zinc-900 italic uppercase tracking-tighter">Fala, {user.name.split(' ')[0]}!</h1>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 p-8 rounded-[3rem] shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 text-8xl">
            <i className="fa-solid fa-cart-shopping animate-pulse text-black"></i>
          </div>
          <p className="text-black font-black uppercase tracking-widest text-[10px] mb-1">Saldo para Compras</p>
          <div className="flex items-center gap-3">
            <span className="text-6xl font-black text-black leading-none tracking-tighter">{wallet.balance || 0}</span>
            <div className="w-10 h-10 rounded-full border-2 border-black/20 flex items-center justify-center">
              <i className="fa-solid fa-gift text-black"></i>
            </div>
          </div>
          <button onClick={() => setView('STORE')} className="mt-6 flex items-center gap-2 bg-black text-yellow-500 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:gap-4 transition-all">Acessar Loja <i className="fa-solid fa-arrow-right"></i></button>
        </div>

        {isLeader && (
          <div className="bg-white border border-zinc-200 p-8 rounded-[3rem] shadow-sm flex flex-col justify-center relative group overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5 text-6xl group-hover:scale-110 transition-transform">
                <i className="fa-solid fa-hand-holding-dollar text-zinc-900"></i>
             </div>
             <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px] mb-2">Verba para Doação</p>
             <div className="flex items-center gap-4">
                <span className="text-4xl font-black text-emerald-500 italic tracking-tighter">{totalDonatablePoints}</span>
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-zinc-400 uppercase">Pontos p/</span>
                  <span className="text-[8px] font-black text-zinc-400 uppercase leading-none">Distribuir</span>
                </div>
             </div>
             <button onClick={() => setView('LEADERSHIP')} className="mt-4 text-emerald-500 font-black uppercase text-[9px] tracking-widest flex items-center gap-2 hover:gap-3 transition-all">
               Distribuir Agora <i className="fa-solid fa-bolt"></i>
             </button>
          </div>
        )}

        <div className="bg-white border border-zinc-200 p-8 rounded-[3rem] shadow-sm flex flex-col justify-center">
          <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px] mb-2">Pedidos Pendentes</p>
          <div className="flex items-center gap-4">
            <span className="text-4xl font-black text-zinc-900 italic">{pendingOrders}</span>
            <div className="px-3 py-1 bg-yellow-50 text-yellow-600 rounded-lg text-[9px] font-black uppercase tracking-wider border border-yellow-200">Status</div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 p-8 rounded-[3rem] shadow-sm flex flex-col justify-center">
          <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px] mb-2">Total de Moedas</p>
          <div className="flex items-center gap-4">
            <span className="text-4xl font-black text-zinc-900 italic tracking-tighter">{totalMoedasRecebidas}</span>
            <div className="w-8 h-8 rounded-full border border-yellow-500/30 flex items-center justify-center">
              <i className="fa-solid fa-crown text-yellow-500 text-sm"></i>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] italic px-2">Timeline de Atividades</h3>
          <div className="bg-white rounded-[3rem] border border-zinc-200 overflow-hidden shadow-sm">
            <table className="w-full">
              <tbody className="divide-y divide-zinc-100">
                {userTransactions.length > 0 ? userTransactions.map((t: Transaction) => (
                  <tr key={t.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-8 py-6">
                      <div className={`w-10 h-10 rounded-full border flex items-center justify-center ${t.isDonationVerba ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-500' : t.type === TransactionType.CREDIT ? 'border-yellow-500/30 bg-yellow-500/5 text-yellow-500' : 'border-zinc-200 bg-zinc-50 text-zinc-400'}`}>
                        <i className={`fa-solid ${t.isDonationVerba ? 'fa-bolt' : t.type === TransactionType.CREDIT ? 'fa-plus' : 'fa-minus'} text-xs`}></i>
                      </div>
                    </td>
                    <td className="px-6 py-6">
                      <p className="text-xs font-black text-zinc-900 uppercase tracking-tight leading-none mb-1">{t.reason}</p>
                      <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest">{t.category}</p>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className={`text-xl font-black italic tracking-tighter ${t.isDonationVerba ? 'text-emerald-500' : t.type === TransactionType.CREDIT ? 'text-yellow-500' : 'text-zinc-400'}`}>
                        {t.type === TransactionType.CREDIT ? '+' : '-'}{t.amount || 0}
                      </p>
                      <p className="text-[9px] text-zinc-300 font-bold">{new Date(t.createdAt).toLocaleDateString()}</p>
                    </td>
                  </tr>
                )) : (<tr><td className="p-12 text-center text-zinc-300 font-black uppercase text-[10px] tracking-widest italic">Sem atividades.</td></tr>)}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.3em] italic px-2">Seu Desempenho por Pilar</h3>
          <div className="bg-white border border-zinc-200 rounded-[3rem] p-6 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-zinc-100">
                    <th className="py-3 text-[9px] font-black text-zinc-300 uppercase tracking-widest">Pilar</th>
                    <th className="py-3 px-2 text-center text-orange-600"><i className="fa-solid fa-circle-dot"></i></th>
                    <th className="py-3 px-2 text-center text-zinc-400"><i className="fa-solid fa-circle-dot"></i></th>
                    <th className="py-3 px-2 text-center text-yellow-500"><i className="fa-solid fa-circle-dot"></i></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {PILARES.map(p => (
                    <tr key={p} className="hover:bg-zinc-50 transition-colors">
                      <td className="py-3 text-[10px] font-black text-zinc-800 uppercase italic">{p}</td>
                      <td className="py-3 px-2 text-center text-xs font-black text-orange-600/60">{pilarStats[p][CoinType.BRONZE] || '-'}</td>
                      <td className="py-3 px-2 text-center text-xs font-black text-zinc-400/60">{pilarStats[p][CoinType.SILVER] || '-'}</td>
                      <td className="py-3 px-2 text-center text-xs font-black text-yellow-500">{pilarStats[p][CoinType.GOLD] || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-100 flex justify-between items-center px-2">
               <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest italic">Total de Moedas:</span>
               <span className="text-2xl font-black text-zinc-900 italic tracking-tighter">{totalMoedasRecebidas}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
export default Dashboard;

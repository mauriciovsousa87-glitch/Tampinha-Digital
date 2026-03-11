
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

  const breweryRanking = useMemo(() => {
    const stats: Record<string, { total: number; name: string; id: string }> = {};
    
    db.users.forEach((u: User) => {
      stats[u.id] = { total: 0, name: u.name, id: u.id };
    });

    (db.transactions || []).forEach((t: Transaction) => {
      if (t.type === TransactionType.CREDIT && !t.isDonationVerba && t.coinType && stats[t.toUserId]) {
        let count = t.coinCount || 0;
        if (!count && t.amount) {
           const weight = t.coinType === CoinType.GOLD ? 3 : t.coinType === CoinType.SILVER ? 2 : 1;
           count = t.amount / weight;
        }
        stats[t.toUserId].total += count;
      }
    });

    return Object.values(stats).sort((a, b) => b.total - a.total);
  }, [db.transactions, db.users]);

  const userRankIndex = breweryRanking.findIndex(r => r.id === user.id);

  const userCoinCounts = useMemo(() => {
    const counts = { [CoinType.GOLD]: 0, [CoinType.SILVER]: 0, [CoinType.BRONZE]: 0 };
    (db.transactions || []).forEach((t: Transaction) => {
      if (t.toUserId === user.id && t.type === TransactionType.CREDIT && !t.isDonationVerba && t.coinType) {
        let count = t.coinCount || 0;
        if (!count && t.amount) {
           const weight = t.coinType === CoinType.GOLD ? 3 : t.coinType === CoinType.SILVER ? 2 : 1;
           count = t.amount / weight;
        }
        counts[t.coinType as CoinType] += count;
      }
    });
    return counts;
  }, [db.transactions, user.id]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-12">
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm">
        <div className="flex items-center gap-5">
          <div className="relative w-16 h-16 flex items-center justify-center flex-shrink-0">
            <div className="absolute inset-0 bg-yellow-500" style={{ clipPath: 'polygon(50% 0%, 55% 2%, 60% 0%, 65% 5%, 72% 3%, 76% 9%, 84% 9%, 87% 16%, 93% 19%, 93% 27%, 99% 32%, 97% 40%, 100% 50%, 97% 60%, 99% 68%, 93% 73%, 93% 81%, 87% 84%, 84% 91%, 76% 91%, 72% 97%, 65% 95%, 60% 100%, 55% 98%, 50% 100%, 45% 98%, 40% 100%, 35% 95%, 28% 97%, 24% 91%, 16% 91%, 13% 84%, 7% 81%, 7% 73%, 1% 68%, 3% 60%, 0% 50%, 3% 40%, 1% 32%, 7% 27%, 7% 19%, 13% 16%, 16% 9%, 24% 9%, 28% 3%, 35% 5%, 40% 0%, 45% 2%)' }}></div>
            <div className="absolute w-[85%] h-[85%] bg-white rounded-full z-10 flex flex-col items-center justify-center">
              <span className="text-yellow-500 font-black italic text-[10px] leading-none">SUPPLY</span>
              <span className="text-zinc-400 font-bold text-[4px] uppercase">NADA NOS PARA!</span>
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black text-zinc-900 italic uppercase tracking-tighter leading-none">Fala, {user.name.split(' ')[0]}!</h1>
            <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-[8px] mt-1 italic">Bem-vindo ao seu portal de reconhecimento.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <div className="h-10 w-[1px] bg-zinc-100 hidden md:block mx-2"></div>
           <div className="text-right hidden sm:block">
              <p className="text-[7px] font-black text-zinc-400 uppercase tracking-widest">Status da Conta</p>
              <p className="text-[9px] font-black text-emerald-500 uppercase italic">Colaborador Ativo</p>
           </div>
           <div className="w-10 h-10 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center text-zinc-400">
              <i className="fa-solid fa-user text-xs"></i>
           </div>
        </div>
      </header>

      {/* TOP STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SALDO COMPRAS */}
        <div className="bg-yellow-500 p-5 rounded-3xl shadow-lg shadow-yellow-500/10 flex flex-col justify-between h-32 relative overflow-hidden group">
          <i className="fa-solid fa-cart-shopping absolute -right-2 -top-2 text-6xl text-black/5 group-hover:scale-110 transition-transform"></i>
          <p className="text-black font-black uppercase tracking-widest text-[8px]">Saldo para Compras</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-black italic tracking-tighter leading-none">{wallet.balance || 0}</span>
            <button onClick={() => setView('STORE')} className="bg-black text-yellow-500 w-8 h-8 rounded-lg flex items-center justify-center hover:scale-105 transition-transform">
              <i className="fa-solid fa-arrow-right text-[10px]"></i>
            </button>
          </div>
        </div>

        {/* VERBA LIDERANÇA (IF LEADER) */}
        {isLeader ? (
          <div className="bg-white border border-zinc-100 p-5 rounded-3xl shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
            <i className="fa-solid fa-hand-holding-dollar absolute -right-2 -top-2 text-6xl text-zinc-50 group-hover:scale-110 transition-transform"></i>
            <p className="text-zinc-400 font-black uppercase tracking-widest text-[8px]">Verba para Doação</p>
            <div className="flex items-end justify-between">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-emerald-500 italic tracking-tighter leading-none">{totalDonatablePoints}</span>
                <span className="text-[7px] font-black text-zinc-300 uppercase">Pts</span>
              </div>
              <button onClick={() => setView('LEADERSHIP')} className="bg-emerald-500 text-white w-8 h-8 rounded-lg flex items-center justify-center hover:scale-105 transition-transform">
                <i className="fa-solid fa-bolt text-[10px]"></i>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-zinc-50 border border-dashed border-zinc-200 p-5 rounded-3xl flex flex-col justify-center items-center h-32 text-center">
            <i className="fa-solid fa-lock text-zinc-200 mb-2"></i>
            <p className="text-[7px] font-black text-zinc-300 uppercase tracking-widest leading-tight">Verba de Liderança<br/>Indisponível</p>
          </div>
        )}

        {/* PEDIDOS PENDENTES */}
        <div className="bg-white border border-zinc-100 p-5 rounded-3xl shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
          <i className="fa-solid fa-clock-rotate-left absolute -right-2 -top-2 text-6xl text-zinc-50 group-hover:scale-110 transition-transform"></i>
          <p className="text-zinc-400 font-black uppercase tracking-widest text-[8px]">Pedidos Pendentes</p>
          <div className="flex items-end justify-between">
            <span className="text-4xl font-black text-zinc-900 italic tracking-tighter leading-none">{pendingOrders}</span>
            <div className="px-2 py-1 bg-yellow-50 text-yellow-600 rounded-md text-[7px] font-black uppercase tracking-wider border border-yellow-100">Aguardando</div>
          </div>
        </div>

        {/* TOTAL MOEDAS */}
        <div className="bg-white border border-zinc-100 p-5 rounded-3xl shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
          <i className="fa-solid fa-crown absolute -right-2 -top-2 text-6xl text-zinc-50 group-hover:scale-110 transition-transform"></i>
          <p className="text-zinc-400 font-black uppercase tracking-widest text-[8px]">Total Conquistado</p>
          <div className="flex items-end justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-zinc-900 italic tracking-tighter leading-none">{totalMoedasRecebidas}</span>
              <span className="text-[7px] font-black text-zinc-300 uppercase">Moedas</span>
            </div>
            <div className="w-8 h-8 rounded-lg bg-zinc-50 flex items-center justify-center">
              <i className="fa-solid fa-medal text-yellow-500 text-[10px]"></i>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (8/12) */}
        <div className="lg:col-span-8 space-y-6">
          {/* EXTRATO DE ATIVIDADES */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic flex items-center gap-2">
                <i className="fa-solid fa-list-ul text-[8px]"></i> Extrato de Atividades
              </h3>
              <span className="text-[8px] font-bold text-zinc-300 uppercase">Últimos 5 registros</span>
            </div>
            
            <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <tbody className="divide-y divide-zinc-100">
                    {userTransactions.length > 0 ? userTransactions.map((t: Transaction) => (
                      <tr key={t.id} className="hover:bg-zinc-50/50 transition-colors">
                        <td className="px-6 py-4 w-16">
                          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${t.isDonationVerba ? 'border-emerald-100 bg-emerald-50 text-emerald-500' : t.type === TransactionType.CREDIT ? 'border-yellow-100 bg-yellow-50 text-yellow-600' : 'border-zinc-100 bg-zinc-50 text-zinc-400'}`}>
                            <i className={`fa-solid ${t.isDonationVerba ? 'fa-bolt' : t.type === TransactionType.CREDIT ? 'fa-plus' : 'fa-minus'} text-[10px]`}></i>
                          </div>
                        </td>
                        <td className="px-2 py-4">
                          <p className="text-[11px] font-black text-zinc-900 uppercase tracking-tight leading-none mb-1">{t.reason}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[7px] text-zinc-400 font-black uppercase tracking-widest">{t.category}</span>
                            {t.pillar && <span className="text-[7px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded font-bold uppercase">{t.pillar}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <p className={`text-base font-black italic tracking-tighter ${t.isDonationVerba ? 'text-emerald-500' : t.type === TransactionType.CREDIT ? 'text-yellow-600' : 'text-zinc-400'}`}>
                            {t.type === TransactionType.CREDIT ? '+' : '-'}{t.amount || 0}
                          </p>
                          <p className="text-[8px] text-zinc-300 font-bold">{new Date(t.createdAt).toLocaleDateString()}</p>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td className="p-16 text-center">
                          <i className="fa-solid fa-folder-open text-zinc-100 text-4xl mb-3 block"></i>
                          <p className="text-zinc-300 font-black uppercase text-[9px] tracking-widest italic">Nenhuma movimentação recente.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {userTransactions.length > 0 && (
                <div className="p-4 bg-zinc-50/50 border-t border-zinc-50 text-center">
                  <button className="text-[8px] font-black text-zinc-400 uppercase tracking-widest hover:text-zinc-600 transition-colors">Ver Extrato Completo</button>
                </div>
              )}
            </div>
          </div>

          {/* RANKING CERVEJARIA (Moved here to fill space) */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic px-2 flex items-center gap-2">
              <i className="fa-solid fa-trophy text-[8px]"></i> Ranking da Cervejaria
            </h3>
            <div className="bg-white rounded-[2rem] p-6 border border-zinc-100 shadow-sm text-zinc-900">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  {breweryRanking.slice(0, 5).map((rank, idx) => (
                    <div key={rank.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${rank.id === user.id ? 'bg-yellow-500 border-yellow-400' : 'border-zinc-50 bg-zinc-50/50 hover:bg-zinc-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black italic ${idx === 0 ? 'bg-yellow-400 text-black' : idx === 1 ? 'bg-zinc-300 text-black' : idx === 2 ? 'bg-orange-600 text-white' : 'bg-zinc-200 text-zinc-500'}`}>
                          {idx + 1}º
                        </div>
                        <span className={`text-[10px] font-black uppercase italic truncate max-w-[120px] ${rank.id === user.id ? 'text-black' : 'text-zinc-600'}`}>{rank.name}</span>
                      </div>
                      <span className={`text-sm font-black italic ${rank.id === user.id ? 'text-black' : 'text-zinc-900'}`}>{rank.total} <span className="text-[8px] uppercase not-italic opacity-50">Pts</span></span>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {breweryRanking.slice(5, 10).map((rank, idx) => (
                    <div key={rank.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${rank.id === user.id ? 'bg-yellow-500 border-yellow-400' : 'border-zinc-50 bg-zinc-50/50 hover:bg-zinc-100'}`}>
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black italic bg-zinc-200 text-zinc-500">
                          {idx + 6}º
                        </div>
                        <span className={`text-[10px] font-black uppercase italic truncate max-w-[120px] ${rank.id === user.id ? 'text-black' : 'text-zinc-600'}`}>{rank.name}</span>
                      </div>
                      <span className={`text-sm font-black italic ${rank.id === user.id ? 'text-black' : 'text-zinc-900'}`}>{rank.total} <span className="text-[8px] uppercase not-italic opacity-50">Pts</span></span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-6 pt-4 border-t border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-4">
                <p className="text-[8px] text-zinc-400 font-black uppercase tracking-widest italic">Você está no top {Math.round(((userRankIndex + 1) / breweryRanking.length) * 100)}% da cervejaria</p>
                <div className="flex gap-2">
                   <div className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-50 rounded-lg border border-zinc-100">
                      <i className="fa-solid fa-users text-[8px] text-zinc-400"></i>
                      <span className="text-[9px] font-black text-zinc-500 uppercase">{db.users.length} Colaboradores</span>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN (4/12) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* RESUMO DE CONQUISTAS (New section for coin counts) */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic px-2 flex items-center gap-2">
              <i className="fa-solid fa-award text-[8px]"></i> Suas Conquistas
            </h3>
            <div className="bg-white border border-zinc-100 rounded-[2rem] p-6 shadow-sm space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-yellow-50 border border-yellow-100 p-3 rounded-2xl text-center">
                  <i className="fa-solid fa-circle text-yellow-500 text-xs mb-1"></i>
                  <p className="text-[14px] font-black text-zinc-900 italic leading-none">{userCoinCounts[CoinType.GOLD]}</p>
                  <p className="text-[6px] font-black text-yellow-600 uppercase tracking-widest mt-1">Ouro</p>
                </div>
                <div className="bg-zinc-50 border border-zinc-100 p-3 rounded-2xl text-center">
                  <i className="fa-solid fa-circle text-zinc-400 text-xs mb-1"></i>
                  <p className="text-[14px] font-black text-zinc-900 italic leading-none">{userCoinCounts[CoinType.SILVER]}</p>
                  <p className="text-[6px] font-black text-zinc-400 uppercase tracking-widest mt-1">Prata</p>
                </div>
                <div className="bg-orange-50 border border-orange-100 p-3 rounded-2xl text-center">
                  <i className="fa-solid fa-circle text-orange-600 text-xs mb-1"></i>
                  <p className="text-[14px] font-black text-zinc-900 italic leading-none">{userCoinCounts[CoinType.BRONZE]}</p>
                  <p className="text-[6px] font-black text-orange-600 uppercase tracking-widest mt-1">Bronze</p>
                </div>
              </div>
              <div className="bg-zinc-900 p-4 rounded-2xl flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <i className="fa-solid fa-star text-yellow-500 text-[10px]"></i>
                    <span className="text-[8px] font-black text-white uppercase tracking-widest">Total de Pontos</span>
                 </div>
                 <span className="text-xl font-black text-yellow-500 italic tracking-tighter">{totalMoedasRecebidas}</span>
              </div>
            </div>
          </div>

          {/* DESEMPENHO POR PILAR */}
          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic px-2 flex items-center gap-2">
              <i className="fa-solid fa-chart-simple text-[8px]"></i> Desempenho por Pilar
            </h3>
            <div className="bg-white border border-zinc-100 rounded-[2rem] p-6 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-zinc-50">
                      <th className="pb-3 text-[8px] font-black text-zinc-300 uppercase tracking-widest">Pilar</th>
                      <th className="pb-3 px-2 text-center"><i className="fa-solid fa-circle text-[7px] text-orange-600"></i></th>
                      <th className="pb-3 px-2 text-center"><i className="fa-solid fa-circle text-[7px] text-zinc-400"></i></th>
                      <th className="pb-3 px-2 text-center"><i className="fa-solid fa-circle text-[7px] text-yellow-500"></i></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50/50">
                    {PILARES.map(p => (
                      <tr key={p} className="hover:bg-zinc-50/30 transition-colors">
                        <td className="py-2.5 text-[10px] font-black text-zinc-700 uppercase italic">{p}</td>
                        <td className="py-2.5 px-2 text-center text-[11px] font-black text-orange-600/40">{pilarStats[p][CoinType.BRONZE] || '-'}</td>
                        <td className="py-2.5 px-2 text-center text-[11px] font-black text-zinc-400/40">{pilarStats[p][CoinType.SILVER] || '-'}</td>
                        <td className="py-2.5 px-2 text-center text-[11px] font-black text-yellow-600">{pilarStats[p][CoinType.GOLD] || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;

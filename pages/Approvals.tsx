
import React, { useState } from 'react';
import { User, Order, OrderStatus, TransactionType, Transaction, Capability, ChallengeStatus, MonthlyChallenge } from '../types';
import { saveDB, addAuditLog, getDB } from '../store';
import { ToastType } from '../components/Toast';

interface ApprovalsProps {
  user: User;
  db: any;
  onRefreshDB: () => void;
  showToast: (msg: string, type: ToastType) => void;
}

const Approvals: React.FC<ApprovalsProps> = ({ user, db, onRefreshDB, showToast }) => {
  const [activeMainTab, setActiveMainTab] = useState<'ORDERS' | 'CHALLENGES'>('ORDERS');
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [note, setNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const isGenteGestao = user.capabilities.includes(Capability.GENTE_GESTAO) || user.capabilities.includes(Capability.ADMIN);

  // Filtro corrigido: PENDENTES vs RESTO DO HISTÓRICO
  const filteredOrders = (db.orders || []).filter((o: Order) => {
    if (activeTab === 'PENDING') return o.status === OrderStatus.PENDING;
    return o.status !== OrderStatus.PENDING;
  }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const filteredChallenges = (db.challenges || []).filter((c: MonthlyChallenge) => {
    if (activeTab === 'PENDING') return c.status === ChallengeStatus.PENDING;
    return c.status !== ChallengeStatus.PENDING;
  }).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const processDecision = async (orderId: string, decision: OrderStatus) => {
    if (decision !== OrderStatus.APPROVED && !note.trim()) {
      showToast('Justificativa obrigatória para reprovar ou pedir ajuste.', 'warning');
      return;
    }

    try {
      setProcessingId(orderId);
      const currentDb = getDB();
      const order = currentDb.orders.find(o => o.id === orderId);
      
      if (!order) {
        showToast('Pedido não encontrado.', 'error');
        return;
      }

      const requester = currentDb.users.find((u: User) => u.id === order.userId);
      const requesterWallet = currentDb.wallets.find((w: any) => w.userId === order.userId);
      
      if (decision === OrderStatus.APPROVED) {
        if (!requesterWallet || requesterWallet.balance < order.totalCost) {
          showToast(`Saldo insuficiente de ${requester?.name}.`, 'error');
          return;
        }

        // Baixa estoque
        for (const oi of order.items) {
          const item = currentDb.rewardItems.find((ri: any) => ri.id === oi.itemId);
          if (!item || item.stock < oi.qty) {
            showToast(`Estoque insuficiente: ${item?.name}.`, 'error');
            return;
          }
          item.stock -= oi.qty;
        }

        // Debita carteira
        requesterWallet.balance -= order.totalCost;
        
        // Registra transação de débito
        currentDb.transactions.unshift({
          id: Math.random().toString(36).substr(2, 9),
          type: TransactionType.DEBIT,
          amount: order.totalCost,
          fromUserId: order.userId,
          toUserId: 'SYSTEM_REDEEM',
          reason: `Resgate Aprovado #${order.id}`,
          category: 'Resgate',
          createdAt: new Date().toISOString(),
          createdBy: user.id
        });
      }

      // Atualiza o status do pedido
      const orderIdx = currentDb.orders.findIndex(o => o.id === orderId);
      currentDb.orders[orderIdx] = {
        ...currentDb.orders[orderIdx],
        status: decision,
        note: note.trim(),
        approverId: user.id,
        updatedAt: new Date().toISOString()
      };

      addAuditLog(currentDb, {
        actorUserId: user.id,
        action: `ORDER_${decision}`,
        entityType: 'ORDER',
        entityId: orderId,
        details: { note: note.trim() }
      });

      saveDB(currentDb);
      onRefreshDB();
      setNote('');
      showToast(`Pedido ${decision === OrderStatus.APPROVED ? 'aprovado' : 'atualizado'} com sucesso!`, 'success');
      
    } catch (e) {
      showToast('Erro ao processar.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const processChallengeDecision = async (challengeId: string, decision: ChallengeStatus) => {
    try {
      setProcessingId(challengeId);
      const currentDb = getDB();
      const challengeIdx = currentDb.challenges.findIndex(c => c.id === challengeId);
      
      if (challengeIdx === -1) {
        showToast('Desafio não encontrado.', 'error');
        return;
      }

      currentDb.challenges[challengeIdx] = {
        ...currentDb.challenges[challengeIdx],
        status: decision,
        approvedBy: user.id,
        approvedAt: new Date().toISOString()
      };

      addAuditLog(currentDb, {
        actorUserId: user.id,
        action: `CHALLENGE_${decision}`,
        entityType: 'CHALLENGE',
        entityId: challengeId,
        details: { decision }
      });

      saveDB(currentDb);
      onRefreshDB();
      showToast(`Desafio ${decision === ChallengeStatus.APPROVED ? 'aprovado' : 'reprovado'} com sucesso!`, 'success');
    } catch (e) {
      showToast('Erro ao processar desafio.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const toggleMetaHit = async (challengeId: string) => {
    try {
      setProcessingId(challengeId);
      const currentDb = getDB();
      const challengeIdx = currentDb.challenges.findIndex(c => c.id === challengeId);
      
      if (challengeIdx === -1) return;

      currentDb.challenges[challengeIdx].isMetaHit = !currentDb.challenges[challengeIdx].isMetaHit;

      addAuditLog(currentDb, {
        actorUserId: user.id,
        action: `CHALLENGE_META_TOGGLE`,
        entityType: 'CHALLENGE',
        entityId: challengeId,
        details: { isMetaHit: currentDb.challenges[challengeIdx].isMetaHit }
      });

      saveDB(currentDb);
      onRefreshDB();
      showToast('Status da meta atualizado!', 'success');
    } catch (e) {
      showToast('Erro ao atualizar meta.', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h1 className="text-4xl font-black text-zinc-900 italic uppercase tracking-tighter">Fila de Aprovações</h1>
        <p className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest mt-1 italic">Gestão de solicitações e desafios.</p>
      </header>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2 bg-zinc-100 p-1.5 rounded-2xl border border-zinc-200 shadow-sm">
          <button 
            onClick={() => setActiveMainTab('ORDERS')}
            className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeMainTab === 'ORDERS' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
          >
            Pedidos de Resgate
          </button>
          {isGenteGestao && (
            <button 
              onClick={() => setActiveMainTab('CHALLENGES')}
              className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeMainTab === 'CHALLENGES' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-400 hover:text-zinc-600'}`}
            >
              Desafios Mensais
            </button>
          )}
        </div>

        <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-zinc-200 shadow-sm">
          <button 
            onClick={() => setActiveTab('PENDING')}
            className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'PENDING' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10' : 'text-zinc-400 hover:text-zinc-900'}`}
          >
            Pendentes
          </button>
          <button 
            onClick={() => setActiveTab('HISTORY')}
            className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'HISTORY' ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/10' : 'text-zinc-400 hover:text-zinc-900'}`}
          >
            Histórico
          </button>
        </div>
      </div>

      <div className="grid gap-6">
        {activeMainTab === 'ORDERS' ? (
          filteredOrders.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border border-dashed border-zinc-200 text-center flex flex-col items-center shadow-sm">
               <i className="fa-solid fa-stamp text-5xl text-zinc-100 mb-4"></i>
               <p className="text-zinc-400 font-black uppercase text-xs tracking-widest italic">Nenhum pedido para mostrar.</p>
            </div>
          ) : (
            filteredOrders.map((order: Order) => {
              const requester = db.users.find((u: any) => u.id === order.userId);
              const isProcessing = processingId === order.id;

              return (
                <div key={order.id} className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 flex flex-col lg:flex-row gap-10 shadow-sm relative hover:shadow-md transition-all">
                  <div className="flex-1 space-y-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black text-yellow-600 uppercase tracking-widest px-3 py-1 bg-yellow-500/10 rounded-lg border border-yellow-500/20 mb-4 inline-block shadow-sm">Pedido #{order.id}</span>
                        <h4 className="text-2xl font-black text-zinc-900 italic uppercase tracking-tighter">{requester?.name || 'Usuário Desconhecido'}</h4>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">ID: {requester?.corporateId} • {new Date(order.createdAt).toLocaleString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] uppercase font-black text-zinc-300 tracking-widest">Total</p>
                        <p className="text-3xl font-black text-yellow-600 italic tracking-tighter">{order.totalCost} t.</p>
                      </div>
                    </div>

                    <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100">
                      <p className="text-[9px] font-black text-zinc-300 uppercase mb-3 tracking-widest">Itens do pedido</p>
                      <div className="grid gap-2">
                        {order.items.map((oi, idx) => {
                          const item = db.rewardItems.find((ri: any) => ri.id === oi.itemId);
                          return (
                            <div key={idx} className="flex justify-between text-xs text-zinc-500 font-bold">
                              <span>{item?.name} (x{oi.qty})</span>
                              <span className="text-zinc-900 italic">{oi.costEach * oi.qty} t.</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-80">
                    {order.status === OrderStatus.PENDING ? (
                      <div className="space-y-4">
                        <textarea 
                          className="w-full p-4 bg-zinc-50 border border-zinc-100 text-zinc-900 rounded-2xl text-xs focus:border-yellow-500 outline-none font-medium h-24 placeholder:text-zinc-300"
                          placeholder="Observação (obrigatória para reprovar)..."
                          value={note}
                          onChange={e => setNote(e.target.value)}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <button 
                            disabled={isProcessing}
                            onClick={() => processDecision(order.id, OrderStatus.REJECTED)}
                            className="py-3 bg-white border border-zinc-200 text-rose-500 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-50 transition-colors"
                          >
                            Reprovar
                          </button>
                          <button 
                            disabled={isProcessing}
                            onClick={() => processDecision(order.id, OrderStatus.ADJUSTMENT_REQUESTED)}
                            className="py-3 bg-white border border-zinc-200 text-blue-500 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-50 transition-colors"
                          >
                            Ajuste
                          </button>
                        </div>
                        <button 
                          disabled={isProcessing}
                          onClick={() => processDecision(order.id, OrderStatus.APPROVED)}
                          className="w-full py-4 bg-yellow-500 text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-yellow-400 flex items-center justify-center gap-2 shadow-lg shadow-yellow-500/20"
                        >
                          {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                          Aprovar
                        </button>
                      </div>
                    ) : (
                      <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 text-center border-dashed">
                         <p className={`text-lg font-black uppercase italic ${order.status === OrderStatus.APPROVED ? 'text-emerald-500' : 'text-rose-500'}`}>{order.status}</p>
                         <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mt-1">Decidido em {new Date(order.updatedAt || '').toLocaleDateString()}</p>
                         {order.note && <p className="mt-4 text-[10px] italic text-zinc-400 border-t border-zinc-100 pt-3">"{order.note}"</p>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )
        ) : (
          filteredChallenges.length === 0 ? (
            <div className="bg-white p-20 rounded-[3rem] border border-dashed border-zinc-200 text-center flex flex-col items-center shadow-sm">
               <i className="fa-solid fa-bullseye text-5xl text-zinc-100 mb-4"></i>
               <p className="text-zinc-400 font-black uppercase text-xs tracking-widest italic">Nenhum desafio para mostrar.</p>
            </div>
          ) : (
            filteredChallenges.map((challenge: MonthlyChallenge) => {
              const creator = db.users.find((u: any) => u.id === challenge.createdBy);
              const isProcessing = processingId === challenge.id;

              return (
                <div key={challenge.id} className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 flex flex-col lg:flex-row gap-10 shadow-sm relative hover:shadow-md transition-all">
                  <div className="flex-1 space-y-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest px-3 py-1 bg-zinc-100 rounded-lg border border-zinc-200 mb-4 inline-block shadow-sm">Desafio Mensal</span>
                        <h4 className="text-2xl font-black text-zinc-900 italic uppercase tracking-tighter">{challenge.area}</h4>
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Registrado por: {creator?.name} • {new Date(challenge.createdAt).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100">
                        <p className="text-[9px] font-black text-zinc-300 uppercase mb-1 tracking-widest">KPI</p>
                        <p className="text-lg font-black text-zinc-900 uppercase italic">{challenge.kpi}</p>
                      </div>
                      <div className="bg-zinc-50 p-5 rounded-2xl border border-zinc-100">
                        <p className="text-[9px] font-black text-zinc-300 uppercase mb-1 tracking-widest">Meta</p>
                        <p className="text-lg font-black text-yellow-600 uppercase italic">{challenge.meta}</p>
                      </div>
                    </div>
                  </div>

                  <div className="w-full lg:w-80 flex flex-col justify-center">
                    {challenge.status === ChallengeStatus.PENDING ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          disabled={isProcessing}
                          onClick={() => processChallengeDecision(challenge.id, ChallengeStatus.REJECTED)}
                          className="py-4 bg-white border border-zinc-200 text-rose-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 transition-colors"
                        >
                          Reprovar
                        </button>
                        <button 
                          disabled={isProcessing}
                          onClick={() => processChallengeDecision(challenge.id, ChallengeStatus.APPROVED)}
                          className="py-4 bg-yellow-500 text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-yellow-400 shadow-lg shadow-yellow-500/20"
                        >
                          Aprovar
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="p-6 bg-zinc-50 rounded-2xl border border-zinc-100 text-center border-dashed">
                           <p className={`text-lg font-black uppercase italic ${challenge.status === ChallengeStatus.APPROVED ? 'text-emerald-500' : 'text-rose-500'}`}>{challenge.status}</p>
                           <p className="text-[9px] text-zinc-400 font-black uppercase tracking-widest mt-1">Decidido em {new Date(challenge.approvedAt || '').toLocaleDateString()}</p>
                        </div>
                        
                        {challenge.status === ChallengeStatus.APPROVED && (
                          <button 
                            disabled={isProcessing}
                            onClick={() => toggleMetaHit(challenge.id)}
                            className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                              challenge.isMetaHit 
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                              : 'bg-white border border-zinc-200 text-zinc-400 hover:text-emerald-500 hover:border-emerald-500'
                            }`}
                          >
                            <i className={`fa-solid ${challenge.isMetaHit ? 'fa-check-double' : 'fa-check'}`}></i>
                            {challenge.isMetaHit ? 'Meta Batida!' : 'Marcar Meta como Batida'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )
        )}
      </div>
    </div>
  );
};

export default Approvals;

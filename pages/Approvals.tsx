
import React, { useState } from 'react';
import { User, Order, OrderStatus, TransactionType, Transaction } from '../types';
import { saveDB, addAuditLog, getDB } from '../store';
import { ToastType } from '../components/Toast';

interface ApprovalsProps {
  user: User;
  db: any;
  onRefreshDB: () => void;
  showToast: (msg: string, type: ToastType) => void;
}

const Approvals: React.FC<ApprovalsProps> = ({ user, db, onRefreshDB, showToast }) => {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [note, setNote] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Filtro corrigido: PENDENTES vs RESTO DO HISTÓRICO
  const filteredOrders = (db.orders || []).filter((o: Order) => {
    if (activeTab === 'PENDING') return o.status === OrderStatus.PENDING;
    return o.status !== OrderStatus.PENDING;
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

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter">Fila de Aprovações</h1>
        <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mt-1 italic">Gestão de solicitações de resgate.</p>
      </header>

      <div className="flex gap-2 bg-zinc-900/50 p-2 rounded-2xl w-fit border border-zinc-800">
        <button 
          onClick={() => setActiveTab('PENDING')}
          className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'PENDING' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10' : 'text-zinc-500 hover:text-white'}`}
        >
          Pendentes ({db.orders.filter((o: any) => o.status === OrderStatus.PENDING).length})
        </button>
        <button 
          onClick={() => setActiveTab('HISTORY')}
          className={`px-8 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'HISTORY' ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-zinc-500 hover:text-white'}`}
        >
          Histórico Total
        </button>
      </div>

      <div className="grid gap-6">
        {filteredOrders.length === 0 ? (
          <div className="bg-zinc-900/20 p-20 rounded-[3rem] border border-dashed border-zinc-800 text-center flex flex-col items-center">
             <i className="fa-solid fa-stamp text-5xl text-zinc-800 mb-4 opacity-20"></i>
             <p className="text-zinc-600 font-black uppercase text-xs tracking-widest italic">Nada para mostrar aqui no momento.</p>
          </div>
        ) : (
          filteredOrders.map((order: Order) => {
            const requester = db.users.find((u: any) => u.id === order.userId);
            const wallet = db.wallets.find((w: any) => w.userId === order.userId) || { balance: 0 };
            const isProcessing = processingId === order.id;

            return (
              <div key={order.id} className="bg-zinc-900/40 p-8 rounded-[2.5rem] border border-zinc-800 flex flex-col lg:flex-row gap-10 shadow-2xl relative">
                <div className="flex-1 space-y-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-black text-yellow-500 uppercase tracking-widest px-3 py-1 bg-yellow-500/10 rounded-lg border border-yellow-500/20 mb-4 inline-block">Pedido #{order.id}</span>
                      <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">{requester?.name || 'Usuário Desconhecido'}</h4>
                      <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">ID: {requester?.corporateId} • {new Date(order.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] uppercase font-black text-zinc-600 tracking-widest">Total</p>
                      <p className="text-3xl font-black text-yellow-500 italic tracking-tighter">{order.totalCost} t.</p>
                    </div>
                  </div>

                  <div className="bg-black/40 p-5 rounded-2xl border border-zinc-800/50">
                    <p className="text-[9px] font-black text-zinc-600 uppercase mb-3 tracking-widest">Itens do pedido</p>
                    <div className="grid gap-2">
                      {order.items.map((oi, idx) => {
                        const item = db.rewardItems.find((ri: any) => ri.id === oi.itemId);
                        return (
                          <div key={idx} className="flex justify-between text-xs text-zinc-400 font-bold">
                            <span>{item?.name} (x{oi.qty})</span>
                            <span className="text-white italic">{oi.costEach * oi.qty} t.</span>
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
                        className="w-full p-4 bg-black border border-zinc-800 text-white rounded-2xl text-xs focus:border-yellow-500 outline-none font-medium h-24"
                        placeholder="Observação (obrigatória para reprovar)..."
                        value={note}
                        onChange={e => setNote(e.target.value)}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          disabled={isProcessing}
                          onClick={() => processDecision(order.id, OrderStatus.REJECTED)}
                          className="py-3 bg-zinc-900 border border-zinc-800 text-rose-500 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-rose-500/10"
                        >
                          Reprovar
                        </button>
                        <button 
                          disabled={isProcessing}
                          onClick={() => processDecision(order.id, OrderStatus.ADJUSTMENT_REQUESTED)}
                          className="py-3 bg-zinc-900 border border-zinc-800 text-blue-500 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-500/10"
                        >
                          Ajuste
                        </button>
                      </div>
                      <button 
                        disabled={isProcessing}
                        onClick={() => processDecision(order.id, OrderStatus.APPROVED)}
                        className="w-full py-4 bg-yellow-500 text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-yellow-400 flex items-center justify-center gap-2"
                      >
                        {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
                        Aprovar
                      </button>
                    </div>
                  ) : (
                    <div className="p-6 bg-black/40 rounded-2xl border border-zinc-800 text-center border-dashed">
                       <p className={`text-lg font-black uppercase italic ${order.status === OrderStatus.APPROVED ? 'text-emerald-500' : 'text-rose-500'}`}>{order.status}</p>
                       <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mt-1">Decidido em {new Date(order.updatedAt || '').toLocaleDateString()}</p>
                       {order.note && <p className="mt-4 text-[10px] italic text-zinc-500 border-t border-zinc-800 pt-3">"{order.note}"</p>}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Approvals;

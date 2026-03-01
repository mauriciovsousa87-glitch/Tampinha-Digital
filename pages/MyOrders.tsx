
import React from 'react';
import { User, Order, OrderStatus } from '../types';

interface MyOrdersProps {
  user: User;
  db: any;
}

const MyOrders: React.FC<MyOrdersProps> = ({ user, db }) => {
  const userOrders = db.orders
    .filter((o: any) => o.userId === user.id)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const getStatusStyle = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20';
      case OrderStatus.APPROVED: return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      case OrderStatus.REJECTED: return 'bg-rose-500/10 text-rose-600 border-rose-500/20';
      case OrderStatus.ADJUSTMENT_REQUESTED: return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case OrderStatus.DELIVERED: return 'bg-zinc-900 text-white border-zinc-900';
      default: return 'bg-zinc-100 text-zinc-400 border-zinc-200';
    }
  };

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.PENDING: return 'Pendente';
      case OrderStatus.APPROVED: return 'Aprovado';
      case OrderStatus.REJECTED: return 'Reprovado';
      case OrderStatus.ADJUSTMENT_REQUESTED: return 'Ajuste Solicitado';
      case OrderStatus.DELIVERED: return 'Entregue';
      default: return status;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h1 className="text-4xl font-black text-zinc-900 italic uppercase tracking-tighter">Minhas Solicitações</h1>
        <p className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest mt-1 italic">Acompanhe o status dos seus resgates.</p>
      </header>

      {userOrders.length === 0 ? (
        <div className="bg-white p-20 rounded-[3rem] border border-dashed border-zinc-200 text-center flex flex-col items-center shadow-sm">
           <i className="fa-solid fa-box-open text-5xl text-zinc-100 mb-4"></i>
           <p className="text-zinc-400 font-black uppercase text-xs tracking-widest italic">Você ainda não realizou nenhum resgate.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {userOrders.map((order: Order) => (
            <div key={order.id} className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm hover:shadow-md transition-all">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border text-xl ${getStatusStyle(order.status)}`}>
                    <i className={`fa-solid ${order.status === OrderStatus.PENDING ? 'fa-clock' : order.status === OrderStatus.APPROVED ? 'fa-check' : order.status === OrderStatus.REJECTED ? 'fa-xmark' : 'fa-truck'}`}></i>
                  </div>
                  <div>
                    <h4 className="text-2xl font-black text-zinc-900 italic uppercase tracking-tighter">Pedido #{order.id}</h4>
                    <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1">Realizado em {new Date(order.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="px-6 py-3 bg-zinc-50 rounded-xl border border-zinc-100">
                    <p className="text-[9px] uppercase font-black text-zinc-300 tracking-widest">Total</p>
                    <p className="text-xl font-black text-yellow-600 italic tracking-tighter">{order.totalCost} t.</p>
                  </div>
                  <div className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-zinc-50">
                <p className="text-[10px] font-black text-zinc-300 uppercase mb-4 tracking-widest">Itens resgatados</p>
                <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                  {order.items.map((oi, idx) => {
                    const item = db.rewardItems.find((ri: any) => ri.id === oi.itemId);
                    return (
                      <div key={idx} className="flex items-center gap-4 min-w-max bg-zinc-50 pr-6 rounded-2xl overflow-hidden border border-zinc-100 group">
                        <img src={item?.imageUrl} className="w-12 h-12 object-cover grayscale group-hover:grayscale-0 transition-all" />
                        <span className="text-xs font-black text-zinc-900 uppercase italic">{item?.name} (x{oi.qty})</span>
                      </div>
                    );
                  })}
                </div>
                {order.note && (
                  <div className="mt-6 p-5 bg-yellow-50 rounded-2xl border border-yellow-100 border-dashed">
                    <p className="text-[9px] font-black text-yellow-700 uppercase tracking-widest mb-1">Observação do Aprovador</p>
                    <p className="text-sm italic text-yellow-900 font-medium">"{order.note}"</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyOrders;

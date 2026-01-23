
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
      case OrderStatus.PENDING: return 'bg-amber-100 text-amber-600';
      case OrderStatus.APPROVED: return 'bg-emerald-100 text-emerald-600';
      case OrderStatus.REJECTED: return 'bg-rose-100 text-rose-600';
      case OrderStatus.ADJUSTMENT_REQUESTED: return 'bg-blue-100 text-blue-600';
      case OrderStatus.DELIVERED: return 'bg-indigo-100 text-indigo-600';
      default: return 'bg-slate-100 text-slate-600';
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
    <div className="space-y-6 animate-in fade-in duration-500">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Minhas Solicitações</h1>
        <p className="text-slate-500">Acompanhe o status dos seus resgates.</p>
      </header>

      {userOrders.length === 0 ? (
        <div className="bg-white p-16 rounded-3xl border border-dashed border-slate-300 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
             <i className="fa-solid fa-box-open text-2xl"></i>
          </div>
          <p className="text-slate-500 font-medium">Você ainda não realizou nenhum resgate.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {userOrders.map((order: Order) => (
            <div key={order.id} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 hover:border-indigo-200 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${getStatusStyle(order.status)}`}>
                    <i className={`fa-solid ${order.status === OrderStatus.PENDING ? 'fa-clock' : order.status === OrderStatus.APPROVED ? 'fa-check' : 'fa-xmark'}`}></i>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">Pedido #{order.id}</h4>
                    <p className="text-sm text-slate-500">Realizado em {new Date(order.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="px-4 py-2 bg-slate-50 rounded-xl">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Total</p>
                    <p className="font-bold text-slate-800">{order.totalCost} tampinhas</p>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-sm font-bold ${getStatusStyle(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-50">
                <p className="text-sm font-bold text-slate-800 mb-2">Itens:</p>
                <div className="flex gap-4 overflow-x-auto pb-2">
                  {order.items.map((oi, idx) => {
                    const item = db.rewardItems.find((ri: any) => ri.id === oi.itemId);
                    return (
                      <div key={idx} className="flex items-center gap-3 min-w-max bg-slate-50 pr-4 rounded-lg overflow-hidden border border-slate-100">
                        <img src={item?.imageUrl} className="w-10 h-10 object-cover" />
                        <span className="text-sm font-medium">{item?.name} (x{oi.qty})</span>
                      </div>
                    );
                  })}
                </div>
                {order.note && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-100">
                    <p className="text-xs font-bold text-amber-700 uppercase">Observação do Aprovador:</p>
                    <p className="text-sm text-amber-800">{order.note}</p>
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

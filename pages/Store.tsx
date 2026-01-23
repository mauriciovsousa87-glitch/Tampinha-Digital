
import React, { useState, useMemo } from 'react';
import { User, RewardItem, OrderStatus, TransactionType } from '../types';
import { saveDB, addAuditLog, getDB } from '../store';
import { ToastType } from '../components/Toast';

interface StoreProps {
  user: User;
  db: any;
  onRefreshDB: () => void;
  showToast: (msg: string, type: ToastType) => void;
}

interface CartItem extends RewardItem {
  quantity: number;
}

const Store: React.FC<StoreProps> = ({ user, db, onRefreshDB, showToast }) => {
  const [filter, setFilter] = useState('');
  const [category, setCategory] = useState('Todas');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const categories = ['Todas', ...Array.from(new Set(db.rewardItems.map((i: any) => i.category)))];
  const wallet = db.wallets.find((w: any) => w.userId === user.id) || { balance: 0 };

  const filteredItems = db.rewardItems.filter((item: RewardItem) => {
    const matchesSearch = item.name.toLowerCase().includes(filter.toLowerCase());
    const matchesCategory = category === 'Todas' || item.category === category;
    return matchesSearch && matchesCategory && item.isActive;
  });

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + (item.cost * item.quantity), 0);
  }, [cart]);

  const addToCart = (item: RewardItem) => {
    if (item.stock <= 0) {
      showToast('Este item está sem estoque.', 'error');
      return;
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        if (existing.quantity >= item.stock) {
          showToast('Quantidade máxima em estoque atingida.', 'warning');
          return prev;
        }
        showToast(`${item.name} adicionado ao carrinho!`, 'success');
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      showToast(`${item.name} adicionado ao carrinho!`, 'success');
      return [...prev, { ...item, quantity: 1 }];
    });
    setShowCart(true);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    if (wallet.balance < cartTotal) {
      showToast('Seu saldo de tampinhas é insuficiente para este pedido.', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      const currentDb = getDB();
      
      const newOrder = {
        id: Math.random().toString(36).substr(2, 9).toUpperCase(),
        userId: user.id,
        status: OrderStatus.PENDING,
        totalCost: cartTotal,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        items: cart.map(item => ({
          itemId: item.id,
          qty: item.quantity,
          costEach: item.cost
        }))
      };

      currentDb.orders.unshift(newOrder);
      
      addAuditLog(currentDb, {
        actorUserId: user.id,
        action: 'ORDER_REQUEST_MULTIPLE',
        entityType: 'ORDER',
        entityId: newOrder.id,
        details: { itemsCount: cart.length, total: cartTotal }
      });

      saveDB(currentDb);
      onRefreshDB();
      
      setCart([]);
      setShowCart(false);
      showToast('Pedido realizado! Aguarde a aprovação do líder.', 'success');
      
    } catch (e) {
      showToast('Erro ao processar o pedido. Tente novamente.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className={`space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 ${showCart ? 'lg:mr-96' : ''} transition-all`}>
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-[1.5rem] bg-yellow-500 flex items-center justify-center shadow-lg shadow-yellow-500/20">
              <i className="fa-solid fa-gift text-black text-3xl"></i>
            </div>
            <div>
              <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">Loja de Brindes</h1>
              <p className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest mt-1 italic">Troque suas tampinhas por prêmios incríveis.</p>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={() => setShowCart(!showCart)}
              className="relative bg-zinc-900 border border-zinc-800 p-4 rounded-2xl text-white hover:border-yellow-500 transition-all"
            >
              <i className="fa-solid fa-cart-shopping text-xl"></i>
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-500 text-black text-[10px] font-black rounded-full flex items-center justify-center border-2 border-black animate-bounce">
                  {cart.length}
                </span>
              )}
            </button>
            <div className="bg-zinc-900/50 backdrop-blur-md border border-zinc-800 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-xl">
               <p className="text-3xl font-black text-white italic tracking-tighter leading-none">{wallet.balance} <span className="text-[10px] text-yellow-500 uppercase not-italic block tracking-widest">Saldo</span></p>
            </div>
          </div>
        </header>

        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/40 p-4 rounded-3xl border border-zinc-800 shadow-lg">
          <div className="relative w-full md:w-96">
            <i className="fa-solid fa-magnifying-glass absolute left-5 top-4 text-zinc-600"></i>
            <input 
              type="text" 
              placeholder="Pesquisar brinde..."
              className="w-full pl-14 pr-6 py-4 bg-black border border-zinc-800 text-white rounded-2xl focus:border-yellow-500 outline-none font-bold placeholder:text-zinc-700"
              value={filter}
              onChange={e => setFilter(e.target.value)}
            />
          </div>
          <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat as string}
                onClick={() => setCategory(cat as string)}
                className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all border ${
                  category === cat 
                  ? 'bg-yellow-500 text-black border-yellow-500 shadow-lg shadow-yellow-500/10' 
                  : 'bg-black text-zinc-500 border-zinc-800 hover:border-zinc-600'
                }`}
              >
                {cat as string}
              </button>
            ))}
          </div>
        </div>

        {/* Grid de Itens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredItems.map((item: RewardItem) => (
            <div key={item.id} className="bg-zinc-900/40 rounded-[2.5rem] overflow-hidden border border-zinc-800 flex flex-col group hover:border-yellow-500/50 transition-all shadow-2xl relative">
              <div className="relative h-48 bg-zinc-800 overflow-hidden">
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-80" />
                <div className="absolute top-4 left-4">
                  <span className="px-3 py-1 bg-black/80 backdrop-blur-md rounded-full text-[8px] font-black text-yellow-500 border border-yellow-500/20 uppercase">
                    {item.category}
                  </span>
                </div>
              </div>
              
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-lg font-black text-white italic uppercase tracking-tighter mb-1 leading-tight">{item.name}</h3>
                <p className="text-zinc-500 text-[10px] font-medium mb-4 flex-1 line-clamp-2">{item.description}</p>
                
                <div className="flex items-center justify-between mb-6">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">Custo</span>
                    <div className="flex items-center gap-1">
                      <span className="text-2xl font-black text-white italic tracking-tighter leading-none">{item.cost}</span>
                      <i className="fa-solid fa-bottle-cap text-yellow-500 text-[10px]"></i>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[8px] uppercase font-black text-zinc-600 tracking-widest">Estoque</p>
                    <p className={`text-xs font-black italic ${item.stock < 3 ? 'text-rose-500' : 'text-emerald-500'}`}>{item.stock} un</p>
                  </div>
                </div>

                <button 
                  disabled={item.stock <= 0}
                  onClick={() => addToCart(item)}
                  className={`w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg ${
                    item.stock <= 0
                    ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                    : 'bg-yellow-500 text-black hover:bg-yellow-400'
                  }`}
                >
                  <i className="fa-solid fa-plus"></i>
                  Adicionar
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Painel do Carrinho Sidebar */}
      <div className={`fixed top-0 right-0 h-screen w-full lg:w-96 bg-zinc-900 border-l border-zinc-800 z-50 transform transition-transform duration-500 ease-out shadow-2xl flex flex-col ${showCart ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-8 flex items-center justify-between border-b border-zinc-800 bg-black/20">
          <div>
            <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter leading-none">Seu Carrinho</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-1">Confira seus itens antes de resgatar.</p>
          </div>
          <button onClick={() => setShowCart(false)} className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-30">
              <i className="fa-solid fa-cart-arrow-down text-6xl mb-4"></i>
              <p className="text-xs font-black uppercase tracking-widest">Carrinho Vazio</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-black/40 p-4 rounded-2xl border border-zinc-800 flex gap-4 animate-in slide-in-from-right-4 duration-300">
                <img src={item.imageUrl} className="w-16 h-16 rounded-xl object-cover grayscale" />
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-black text-white uppercase italic truncate mb-1">{item.name}</h4>
                  <p className="text-[10px] text-yellow-500 font-black italic">{item.cost} t. <span className="text-zinc-500 font-medium not-italic ml-2">x{item.quantity}</span></p>
                  <div className="flex items-center gap-2 mt-2">
                    <button 
                      onClick={() => removeFromCart(item.id)}
                      className="text-[9px] font-black text-rose-500 uppercase hover:underline"
                    >
                      Remover
                    </button>
                  </div>
                </div>
                <div className="text-right flex flex-col justify-center">
                  <p className="text-sm font-black text-white italic">{item.cost * item.quantity} t.</p>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-8 bg-black/40 border-t border-zinc-800 space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-zinc-500">
                <span className="text-[10px] font-black uppercase tracking-widest">Seu Saldo Atual</span>
                <span className="text-xs font-bold">{wallet.balance} tampinhas</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-sm font-black text-white uppercase italic tracking-tighter">Total do Pedido</span>
                <div className="text-right">
                  <span className={`text-3xl font-black italic tracking-tighter ${wallet.balance < cartTotal ? 'text-rose-500' : 'text-yellow-500'}`}>
                    {cartTotal} t.
                  </span>
                </div>
              </div>
            </div>

            <button 
              disabled={isProcessing || wallet.balance < cartTotal}
              onClick={handleCheckout}
              className={`w-full py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 active:scale-95 ${
                wallet.balance < cartTotal || isProcessing
                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                : 'bg-yellow-500 text-black hover:bg-yellow-400'
              }`}
            >
              {isProcessing ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-check"></i>}
              {wallet.balance < cartTotal ? 'Saldo Insuficiente' : 'Finalizar Resgate'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Store;

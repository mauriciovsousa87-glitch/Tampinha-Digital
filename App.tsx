
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  User, UserStatus, Role, Capability, Wallet, Transaction, 
  RewardItem, Order, OrderStatus, TransactionType 
} from './types';
import { getDB, saveDB, INITIAL_DB } from './store';
import { supabase } from './src/lib/supabase';

// Pages & Components
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Store from './pages/Store';
import MyOrders from './pages/MyOrders';
import Leadership from './pages/Leadership';
import Approvals from './pages/Approvals';
import Admin from './pages/Admin';
import MonthlyChallenge from './pages/MonthlyChallenge';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Toast, { ToastType } from './components/Toast';

const App: React.FC = () => {
  const [db, setDb] = useState(INITIAL_DB);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'DASHBOARD' | 'STORE' | 'MY_ORDERS' | 'LEADERSHIP' | 'APPROVALS' | 'ADMIN' | 'MONTHLY_CHALLENGE'>('LOGIN');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  }, []);

  const syncWithCloud = useCallback(async (data: any) => {
    saveDB(data);
    if (!supabase) return; // Pula sincronização se não houver cliente
    try {
      await supabase
        .from('app_state')
        .upsert({ 
          id: 1, 
          content: data, 
          updated_at: new Date().toISOString() 
        }, { onConflict: 'id' });
    } catch (err) {
      console.error('Falha na sincronização cloud:', err);
    }
  }, []);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      
      // Timeout de segurança: se em 5 segundos não carregar, usa o local
      const timeoutId = setTimeout(() => {
        console.warn("Sincronização com Supabase demorou demais. Usando LocalStorage.");
        setDb(getDB());
        setIsLoading(false);
      }, 5000);

      try {
        // Se não houver supabase (ambiente local), carrega do LocalStorage
        if (!supabase) {
          setDb(getDB());
          clearTimeout(timeoutId);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('app_state')
          .select('content')
          .eq('id', 1)
          .maybeSingle();

        if (!error && data?.content) {
          const merged = {
            ...INITIAL_DB,
            ...data.content,
            users: data.content.users || INITIAL_DB.users,
            wallets: data.content.wallets || INITIAL_DB.wallets,
            transactions: data.content.transactions || INITIAL_DB.transactions,
            rewardItems: data.content.rewardItems || INITIAL_DB.rewardItems,
            orders: data.content.orders || INITIAL_DB.orders,
            challenges: data.content.challenges || INITIAL_DB.challenges,
            auditLogs: data.content.auditLogs || INITIAL_DB.auditLogs,
          };
          setDb(merged);
          saveDB(merged);
        } else {
          if (error) console.error("Erro ao buscar dados do Supabase:", error);
          setDb(getDB());
        }
      } catch (err) {
        console.error("Falha crítica na inicialização:", err);
        setDb(getDB());
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };
    initData();
  }, []);

  useEffect(() => {
    if (!isLoading && (view === 'LOGIN' || view === 'REGISTER')) {
      const savedUserId = localStorage.getItem('current_user_id');
      if (savedUserId) {
        const dbUser = db.users.find(u => u.id === savedUserId);
        if (dbUser && dbUser.status === UserStatus.ACTIVE) {
          setUser(dbUser);
          setView('DASHBOARD');
        }
      }
    }
  }, [isLoading, db.users, view]);

  const handleLogin = (u: User) => {
    if (u.status === UserStatus.PENDING) return showToast('Cadastro pendente de aprovação.', 'warning');
    if (u.status === UserStatus.BLOCKED) return showToast('Sua conta está bloqueada.', 'error');
    setUser(u);
    localStorage.setItem('current_user_id', u.id);
    setView('DASHBOARD');
    showToast(`Bem-vindo, ${u.name}!`, 'success');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('current_user_id');
    setView('LOGIN');
  };

  const refreshDB = useCallback(() => {
    const current = getDB();
    setDb(current);
    syncWithCloud(current);
  }, [syncWithCloud]);

  const userWallet = useMemo(() => {
    const found = user ? db.wallets.find(w => w.userId === user.id) : null;
    return found || { userId: user?.id || '', balance: 0, donatableGold: 0, donatableSilver: 0, donatableBronze: 0 };
  }, [user, db.wallets]);

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
      <div className="tampinha-container mb-8 scale-75">
        <div className="tampinha-serrilha"></div>
        <div className="tampinha-fundo-preto">
          <span className="text-yellow-500 font-black italic text-xl">S</span>
        </div>
      </div>
      <p className="text-zinc-400 font-black uppercase tracking-widest text-[10px] animate-pulse italic">Carregando Supply Digital...</p>
      <button 
        onClick={() => setIsLoading(false)} 
        className="mt-8 text-[8px] font-black uppercase tracking-widest text-zinc-300 hover:text-zinc-500 transition-colors underline underline-offset-4"
      >
        Pular Sincronização (Usar Local)
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {view !== 'LOGIN' && view !== 'REGISTER' && (
        <Sidebar currentView={view} setView={setView} capabilities={user?.capabilities || []} />
      )}
      <div className="flex-1 flex flex-col min-w-0">
        {view !== 'LOGIN' && view !== 'REGISTER' && (
          <Topbar user={user} wallet={userWallet} onLogout={handleLogout} />
        )}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto bg-slate-50">
          <div className="max-w-7xl mx-auto">
            {view === 'LOGIN' && <Login onLogin={handleLogin} onGoToRegister={() => setView('REGISTER')} db={db} onRefreshDB={refreshDB} showToast={showToast} />}
            {view === 'REGISTER' && <Register onGoToLogin={() => setView('LOGIN')} db={db} onRefreshDB={refreshDB} showToast={showToast} />}
            {view === 'DASHBOARD' && <Dashboard user={user!} db={db} setView={setView} />}
            {view === 'STORE' && <Store user={user!} db={db} onRefreshDB={refreshDB} showToast={showToast} />}
            {view === 'MY_ORDERS' && <MyOrders user={user!} db={db} />}
            {view === 'LEADERSHIP' && <Leadership user={user!} db={db} onRefreshDB={refreshDB} showToast={showToast} />}
            {view === 'APPROVALS' && <Approvals user={user!} db={db} onRefreshDB={refreshDB} showToast={showToast} />}
            {view === 'ADMIN' && <Admin user={user!} db={db} onRefreshDB={refreshDB} showToast={showToast} />}
            {view === 'MONTHLY_CHALLENGE' && <MonthlyChallenge user={user!} db={db} onRefreshDB={refreshDB} showToast={showToast} />}
          </div>
        </main>
      </div>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default App;

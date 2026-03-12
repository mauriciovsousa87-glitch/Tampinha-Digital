
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
import Recognition from './pages/Recognition';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Toast, { ToastType } from './components/Toast';

const App: React.FC = () => {
  const [db, setDb] = useState(INITIAL_DB);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'DASHBOARD' | 'STORE' | 'MY_ORDERS' | 'LEADERSHIP' | 'APPROVALS' | 'ADMIN' | 'MONTHLY_CHALLENGE' | 'RECOGNITION'>('LOGIN');
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [activeRecognition, setActiveRecognition] = useState<any>(null);

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

  const checkUnreadRecognitions = useCallback((u: User) => {
    const currentDb = getDB();
    const unread = (currentDb.recognitions || []).filter((r: any) => r.toUserId === u.id && !r.isRead);
    if (unread.length > 0) {
      setActiveRecognition(unread[0]);
    }
  }, []);

  const markRecognitionAsRead = useCallback(() => {
    if (!activeRecognition || !user) return;
    
    const currentDb = getDB();
    const idx = (currentDb.recognitions || []).findIndex((r: any) => r.id === activeRecognition.id);
    if (idx !== -1) {
      currentDb.recognitions[idx].isRead = true;
      syncWithCloud(currentDb);
      setDb(currentDb);
    }
    setActiveRecognition(null);
  }, [activeRecognition, user, syncWithCloud]);

  useEffect(() => {
    if (!isLoading && (view === 'LOGIN' || view === 'REGISTER')) {
      const savedUserId = localStorage.getItem('current_user_id');
      if (savedUserId) {
        const dbUser = db.users.find(u => u.id === savedUserId);
        if (dbUser && dbUser.status === UserStatus.ACTIVE) {
          setUser(dbUser);
          setView('DASHBOARD');
          checkUnreadRecognitions(dbUser);
        }
      }
    }
  }, [isLoading, db.users, view, checkUnreadRecognitions]);

  const handleLogin = (u: User) => {
    if (u.status === UserStatus.PENDING) return showToast('Cadastro pendente de aprovação.', 'warning');
    if (u.status === UserStatus.BLOCKED) return showToast('Sua conta está bloqueada.', 'error');
    setUser(u);
    localStorage.setItem('current_user_id', u.id);
    setView('DASHBOARD');
    showToast(`Bem-vindo, ${u.name}!`, 'success');
    checkUnreadRecognitions(u);
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
            {view === 'RECOGNITION' && <Recognition user={user!} db={db} onRefreshDB={refreshDB} showToast={showToast} />}
          </div>
        </main>
      </div>

      {/* Recognition Celebration Overlay */}
      {activeRecognition && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="relative max-w-lg w-full p-8 text-center space-y-8 animate-in zoom-in-95 duration-700">
            {/* Celebration Visual */}
            <div className="relative">
              <div className="absolute inset-0 bg-emerald-500/20 blur-[100px] rounded-full animate-pulse"></div>
              <div className="relative w-64 h-64 mx-auto rounded-[3rem] overflow-hidden border-4 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.3)]">
                <img 
                  src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJqZ3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6Z3R6JmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l41lUjX8X8X8X8X8X/giphy.gif" 
                  alt="Celebration"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              {/* Confetti particles could be added here with CSS */}
            </div>

            <div className="space-y-4">
              <p className="text-emerald-400 font-black uppercase tracking-[0.4em] text-xs italic">Você foi reconhecido!</p>
              <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-tight">
                {db.users.find((u: any) => u.id === activeRecognition.fromUserId)?.name} reconheceu você!
              </h2>
              <div className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-sm">
                <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest mb-2">Pelo princípio:</p>
                <p className="text-xl font-black text-zinc-100 italic">"{activeRecognition.principle}"</p>
              </div>
            </div>

            <button 
              onClick={markRecognitionAsRead}
              className="bg-emerald-500 text-white font-black uppercase text-xs tracking-widest px-12 py-5 rounded-2xl shadow-2xl shadow-emerald-500/40 hover:scale-105 transition-all active:scale-95"
            >
              Continuar para o App
            </button>
          </div>
        </div>
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default App;

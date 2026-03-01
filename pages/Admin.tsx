
import React, { useState, useMemo, useEffect } from 'react';
import { User, UserStatus, Role, Capability, RewardItem, Wallet, CoinType, TransactionType, Transaction } from '../types';
import { saveDB, addAuditLog, getDB } from '../store';
import { ToastType } from '../components/Toast';
import { supabase } from '../src/lib/supabase';

interface AdminProps {
  user: User;
  db: any;
  onRefreshDB: () => void;
  showToast: (msg: string, type: ToastType) => void;
}

const Admin: React.FC<AdminProps> = ({ user, db, onRefreshDB, showToast }) => {
  const [activeTab, setActiveTab] = useState<'USERS' | 'ITEMS' | 'STATS'>('USERS');
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [itemToEdit, setItemToEdit] = useState<RewardItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  
  // Estados para o modal de item
  const [modalStock, setModalStock] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');

  // Estados para o modal de edição/criação de usuário
  const [editUserName, setEditUserName] = useState('');
  const [editUserId, setEditUserId] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');

  // Sincroniza o estoque do modal quando o item a editar muda
  useEffect(() => {
    if (itemToEdit) {
      setModalStock(itemToEdit.stock || 0);
      setPreviewUrl(itemToEdit.imageUrl || '');
    } else if (isAddingItem) {
      setModalStock(0);
      setPreviewUrl('');
    }
    setSelectedFile(null);
  }, [itemToEdit, isAddingItem]);

  // Sincroniza os dados do usuário no modal de edição
  useEffect(() => {
    if (userToEdit) {
      setEditUserName(userToEdit.name);
      setEditUserId(userToEdit.corporateId);
      setEditUserPassword(userToEdit.passwordHash);
    } else if (isAddingUser) {
      setEditUserName('');
      setEditUserId('');
      setEditUserPassword('');
    }
  }, [userToEdit, isAddingUser]);

  const economicData = useMemo(() => {
    const rewardItems = db.rewardItems || [];
    const wallets = db.wallets || [];
    const totalStockValue = rewardItems.reduce((acc: number, item: RewardItem) => acc + ((item.cost || 0) * (item.stock || 0)), 0);
    const personalPoints = wallets.reduce((acc: number, w: Wallet) => acc + (w.balance || 0), 0);
    const donationPoints = wallets.reduce((acc: number, w: Wallet) => {
      return acc + ((w.donatableGold || 0) * 3) + ((w.donatableSilver || 0) * 2) + ((w.donatableBronze || 0) * 1);
    }, 0);
    return { totalStockValue, totalDistributedPoints: personalPoints + donationPoints, balanceGap: totalStockValue - (personalPoints + donationPoints) };
  }, [db.rewardItems, db.wallets]);

  // Ranking Olímpico - CORRIGIDA LÓGICA DE CONTAGEM
  const olympicRanking = useMemo(() => {
    const stats: Record<string, { gold: number; silver: number; bronze: number; name: string; corporateId: string }> = {};
    
    db.users.forEach((u: User) => {
      stats[u.id] = { gold: 0, silver: 0, bronze: 0, name: u.name, corporateId: u.corporateId };
    });

    (db.transactions || []).forEach((t: Transaction) => {
      if (t.type === TransactionType.CREDIT && !t.isDonationVerba && t.coinType && stats[t.toUserId]) {
        // Se a transação tem coinCount salvo, usa ele. Caso contrário deriva do amount/weight
        let count = t.coinCount || 0;
        if (!count && t.amount) {
           const weight = t.coinType === CoinType.GOLD ? 3 : t.coinType === CoinType.SILVER ? 2 : 1;
           count = t.amount / weight;
        }

        if (t.coinType === CoinType.GOLD) stats[t.toUserId].gold += count;
        else if (t.coinType === CoinType.SILVER) stats[t.toUserId].silver += count;
        else if (t.coinType === CoinType.BRONZE) stats[t.toUserId].bronze += count;
      }
    });

    return Object.values(stats).sort((a, b) => {
      if (b.gold !== a.gold) return b.gold - a.gold;
      if (b.silver !== a.silver) return b.silver - a.silver;
      return b.bronze - a.bronze;
    });
  }, [db.transactions, db.users]);

  // Fix: Adding sortedUsers to avoid "Cannot find name 'sortedUsers'" error.
  const sortedUsers = useMemo(() => {
    return [...(db.users || [])].sort((a, b) => a.name.localeCompare(b.name));
  }, [db.users]);

  // --- GESTÃO DE USUÁRIOS ---
  const handleSaveUser = () => {
    if (!editUserName.trim() || !editUserId.trim() || !editUserPassword.trim()) {
      showToast('Preencha todos os campos obrigatórios.', 'warning');
      return;
    }
    const currentDb = getDB();
    const idExists = currentDb.users.some((u: User) => u.corporateId === editUserId && u.id !== userToEdit?.id);
    if (idExists) { showToast('Este ID Corporativo já pertence a outro colaborador.', 'error'); return; }

    if (userToEdit) {
      const userInDb = currentDb.users.find((u: User) => u.id === userToEdit.id);
      if (userInDb) {
        userInDb.name = editUserName; userInDb.corporateId = editUserId; userInDb.passwordHash = editUserPassword;
        showToast('Dados do colaborador atualizados!', 'success');
      }
    } else {
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9), corporateId: editUserId, name: editUserName,
        passwordHash: editUserPassword, status: UserStatus.ACTIVE, roles: [Role.USER],
        capabilities: [Capability.OPERADOR], createdAt: new Date().toISOString()
      };
      currentDb.users.push(newUser);
      currentDb.wallets.push({ userId: newUser.id, balance: 0, donatableGold: 0, donatableSilver: 0, donatableBronze: 0 });
      showToast(`${editUserName} cadastrado com sucesso!`, 'success');
    }
    saveDB(currentDb); onRefreshDB(); setUserToEdit(null); setIsAddingUser(false);
  };

  const handleAdjustVerba = (targetUser: User, newValue: number) => {
    const currentDb = getDB();
    const wallet = currentDb.wallets.find((w: any) => w.userId === targetUser.id);
    if (!wallet) return;
    let weight = 1; let coinType = CoinType.BRONZE;
    if (targetUser.capabilities.includes(Capability.ADMIN) || targetUser.capabilities.includes(Capability.GERENTE_FABRIL)) { coinType = CoinType.GOLD; weight = 3; }
    else if (targetUser.capabilities.includes(Capability.GERENTE_AREA)) { coinType = CoinType.SILVER; weight = 2; }
    const currentVal = coinType === CoinType.GOLD ? (wallet.donatableGold || 0) : coinType === CoinType.SILVER ? (wallet.donatableSilver || 0) : (wallet.donatableBronze || 0);
    const delta = newValue - currentVal;
    if (delta > 0 && (delta * weight) > economicData.balanceGap) { showToast('Limite de emissão atingido!', 'error'); return; }
    if (coinType === CoinType.GOLD) wallet.donatableGold = Math.max(0, newValue);
    else if (coinType === CoinType.SILVER) wallet.donatableSilver = Math.max(0, newValue);
    else wallet.donatableBronze = Math.max(0, newValue);
    if (delta !== 0) {
      currentDb.transactions.unshift({ id: Math.random().toString(36).substr(2, 9), type: TransactionType.CREDIT, amount: Math.abs(delta * weight), coinType, fromUserId: 'SYSTEM', toUserId: targetUser.id, reason: 'Ajuste Admin Verba', category: 'Administração', createdAt: new Date().toISOString(), createdBy: user.id, isDonationVerba: true });
      saveDB(currentDb); onRefreshDB();
    }
  };

  const handleAdjustSaldo = (targetUser: User, newValue: number) => {
    const currentDb = getDB();
    const wallet = currentDb.wallets.find((w: any) => w.userId === targetUser.id);
    if (!wallet) return;
    const delta = newValue - (wallet.balance || 0);
    if (delta > 0 && delta > economicData.balanceGap) { showToast('Estoque insuficiente!', 'error'); return; }
    wallet.balance = Math.max(0, newValue);
    if (delta !== 0) {
      currentDb.transactions.unshift({ id: Math.random().toString(36).substr(2, 9), type: delta > 0 ? TransactionType.CREDIT : TransactionType.DEBIT, amount: Math.abs(delta), fromUserId: 'SYSTEM', toUserId: targetUser.id, reason: 'Correção de Saldo Admin', category: 'Administração', createdAt: new Date().toISOString(), createdBy: user.id });
      saveDB(currentDb); onRefreshDB();
    }
  };

  const toggleCapability = (u: User, cap: Capability) => {
    const currentDb = getDB();
    const userInDb = currentDb.users.find((user: User) => user.id === u.id);
    if (userInDb) {
      const jobRoles = [Capability.OPERADOR, Capability.SUPERVISOR_COORDENADOR, Capability.GERENTE_AREA, Capability.GERENTE_FABRIL, Capability.GENTE_GESTAO];
      if (jobRoles.includes(cap)) { userInDb.capabilities = userInDb.capabilities.filter(c => !jobRoles.includes(c)); userInDb.capabilities.push(cap); }
      else { if (userInDb.capabilities.includes(cap)) { userInDb.capabilities = userInDb.capabilities.filter(c => c !== cap); } else { userInDb.capabilities.push(cap); } }
      saveDB(currentDb); onRefreshDB(); if (userToEdit) setUserToEdit({ ...userInDb });
    }
  };

  const handleUpdateItemStock = (itemId: string, newStock: number) => {
    const currentDb = getDB(); const item = currentDb.rewardItems.find(i => i.id === itemId);
    if (item) { item.stock = Math.max(0, newStock); saveDB(currentDb); onRefreshDB(); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) { setSelectedFile(file); setPreviewUrl(URL.createObjectURL(file)); }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault(); setIsUploading(true);
    try {
      const formData = new FormData(e.currentTarget as HTMLFormElement);
      let finalImageUrl = itemToEdit?.imageUrl || '';
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
        const filePath = `items/${fileName}`;
        const uploadResult = await supabase?.storage.from('reward-images').upload(filePath, selectedFile);
        if (uploadResult?.error) throw uploadResult.error;
        const { data: { publicUrl } } = supabase?.storage.from('reward-images').getPublicUrl(filePath) || { data: { publicUrl: '' } };
        finalImageUrl = publicUrl;
      }
      const itemData = { name: formData.get('name') as string, description: formData.get('description') as string, imageUrl: finalImageUrl, cost: Number(formData.get('cost')), stock: modalStock, category: formData.get('category') as string, isActive: true };
      const currentDb = getDB();
      if (itemToEdit) { const idx = currentDb.rewardItems.findIndex(i => i.id === itemToEdit.id); currentDb.rewardItems[idx] = { ...itemToEdit, ...itemData }; }
      else { currentDb.rewardItems.push({ ...itemData, id: Math.random().toString(36).substr(2, 9) }); }
      saveDB(currentDb); onRefreshDB(); setItemToEdit(null); setIsAddingItem(false);
    } catch (err: any) { showToast('Erro ao salvar: ' + err.message, 'error'); } finally { setIsUploading(false); }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-zinc-900 italic uppercase tracking-tighter leading-none">Painel de Controle</h1>
          <p className="text-zinc-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic">Gestão Econômica e Inventário de Brindes.</p>
        </div>
        <div className="flex gap-2 bg-white p-2 rounded-2xl w-fit border border-zinc-200 shadow-sm overflow-x-auto no-scrollbar max-w-full">
          <button onClick={() => setActiveTab('USERS')} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'USERS' ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/10' : 'text-zinc-400 hover:text-zinc-900'}`}>Colaboradores</button>
          <button onClick={() => setActiveTab('ITEMS')} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'ITEMS' ? 'bg-zinc-900 text-white shadow-lg shadow-zinc-900/10' : 'text-zinc-400 hover:text-zinc-900'}`}>Estoque</button>
          <button onClick={() => setActiveTab('STATS')} className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'STATS' ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/10' : 'text-zinc-400 hover:text-zinc-900'}`}>Dashboard</button>
        </div>
      </header>

      {/* CARDS ECONÔMICOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-6 rounded-[2rem] border transition-colors shadow-sm ${economicData.balanceGap < 0 ? 'bg-rose-50 border-rose-100' : 'bg-emerald-50 border-emerald-100'}`}>
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Capacidade de Emissão (Estoque Livre)</p>
          <div className="flex items-baseline gap-2 text-emerald-600 font-black italic tracking-tighter">
            <span className="text-4xl">{economicData.balanceGap || 0}</span>
            <span className="text-[8px] uppercase">Pts</span>
          </div>
        </div>
        <div className="p-6 rounded-[2rem] bg-white border border-zinc-200 shadow-sm">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Passivo (Moedas em Mãos)</p>
          <div className="flex items-baseline gap-2 text-zinc-900 font-black italic tracking-tighter">
            <span className="text-4xl">{economicData.totalDistributedPoints || 0}</span>
            <span className="text-[8px] uppercase">Pts</span>
          </div>
        </div>
        <div className="p-6 rounded-[2rem] bg-white border border-zinc-200 shadow-sm">
          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Patrimônio Brindes (Total em Itens)</p>
          <div className="flex items-baseline gap-2 text-yellow-600 font-black italic tracking-tighter">
            <span className="text-4xl">{economicData.totalStockValue || 0}</span>
            <span className="text-[8px] uppercase">Pts</span>
          </div>
        </div>
      </div>

      {activeTab === 'USERS' && (
        <div className="bg-white border border-zinc-200 rounded-[3rem] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
            <h2 className="font-black italic uppercase tracking-tighter text-xl text-zinc-900">Lista de Colaboradores</h2>
            <button onClick={() => setIsAddingUser(true)} className="bg-emerald-500 text-black px-6 py-2.5 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10"><i className="fa-solid fa-user-plus"></i> Novo Colaborador</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-zinc-50">
                <tr>
                  <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Colaborador</th>
                  <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center">Verba Liderança</th>
                  <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center">Saldo Loja</th>
                  <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {sortedUsers.map((u: User) => {
                  const wallet = db.wallets.find((w: any) => w.userId === u.id) || { balance: 0, donatableGold: 0, donatableSilver: 0, donatableBronze: 0 };
                  const isLeader = u.capabilities.some(c => [Capability.SUPERVISOR_COORDENADOR, Capability.GERENTE_AREA, Capability.GERENTE_FABRIL, Capability.GENTE_GESTAO, Capability.ADMIN].includes(c));
                  const coinValue = u.capabilities.includes(Capability.ADMIN) || u.capabilities.includes(Capability.GERENTE_FABRIL) ? (wallet.donatableGold || 0) : u.capabilities.includes(Capability.GERENTE_AREA) ? (wallet.donatableSilver || 0) : (wallet.donatableBronze || 0);
                  return (
                    <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <p className="font-black text-zinc-900 uppercase italic tracking-tighter leading-none mb-1">{u.name}</p>
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{u.corporateId}</span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex justify-center">
                          {isLeader ? (
                            <div className="flex items-center bg-zinc-50 border border-zinc-100 rounded-2xl overflow-hidden p-1 gap-1">
                              <button onClick={() => handleAdjustVerba(u, Math.max(0, coinValue - 1))} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-zinc-900"><i className="fa-solid fa-minus text-[10px]"></i></button>
                              <input type="number" className="w-12 bg-transparent text-center text-lg font-black text-yellow-600 italic outline-none" value={coinValue} onChange={(e) => handleAdjustVerba(u, parseInt(e.target.value) || 0)} />
                              <button onClick={() => handleAdjustVerba(u, coinValue + 1)} className="w-8 h-8 flex items-center justify-center text-yellow-600"><i className="fa-solid fa-plus text-[10px]"></i></button>
                            </div>
                          ) : <span className="text-[9px] text-zinc-300 font-black uppercase italic">Sem Perfil Líder</span>}
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="flex justify-center">
                          <div className="flex items-center bg-zinc-50 border border-zinc-100 rounded-2xl overflow-hidden p-1 gap-1">
                            <button onClick={() => handleAdjustSaldo(u, Math.max(0, (wallet.balance || 0) - 1))} className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-rose-500"><i className="fa-solid fa-minus text-[10px]"></i></button>
                            <input type="number" className="w-16 bg-transparent text-center text-lg font-black text-zinc-900 italic outline-none" value={wallet.balance || 0} onChange={(e) => handleAdjustSaldo(u, parseInt(e.target.value) || 0)} />
                            <button onClick={() => handleAdjustSaldo(u, (wallet.balance || 0) + 1)} className="w-8 h-8 flex items-center justify-center text-emerald-500"><i className="fa-solid fa-plus text-[10px]"></i></button>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={() => setUserToEdit(u)} className="w-10 h-10 rounded-xl bg-zinc-100 text-zinc-400 flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-all"><i className="fa-solid fa-user-gear"></i></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ITEMS' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-zinc-900 italic uppercase tracking-tighter">Catálogo de Brindes</h2>
            <button onClick={() => { setItemToEdit(null); setIsAddingItem(true); }} className="bg-emerald-500 text-black px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10"><i className="fa-solid fa-plus"></i> Novo Item</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {db.rewardItems.map((item: RewardItem) => (
              <div key={item.id} className="bg-white border border-zinc-200 rounded-[2.5rem] p-6 space-y-4 hover:border-yellow-500/50 transition-all flex flex-col group shadow-sm">
                 <div className="flex items-center gap-4">
                    <img src={item.imageUrl} className="w-16 h-16 rounded-2xl object-cover grayscale group-hover:grayscale-0 transition-all" />
                    <div className="flex-1 min-w-0">
                       <h4 className="text-sm font-black text-zinc-900 italic uppercase truncate">{item.name}</h4>
                       <p className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">{item.category} • {item.cost} pts</p>
                    </div>
                    <button onClick={() => setItemToEdit(item)} className="text-zinc-300 hover:text-zinc-900 transition-colors"><i className="fa-solid fa-pen-to-square"></i></button>
                 </div>
                 <div className="pt-4 border-t border-zinc-100">
                    <div className="flex items-center justify-between mb-2">
                       <p className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">Estoque</p>
                       <span className={`text-[10px] font-black italic ${item.stock < 5 ? 'text-rose-500' : 'text-emerald-500'}`}>{item.stock} UN</span>
                    </div>
                    <div className="flex items-center bg-zinc-50 border border-zinc-100 rounded-2xl p-1 gap-1">
                      <button onClick={() => handleUpdateItemStock(item.id, item.stock - 1)} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-rose-500"><i className="fa-solid fa-minus"></i></button>
                      <input type="number" className="flex-1 bg-transparent text-center text-xl font-black text-zinc-900 italic outline-none" value={item.stock} onChange={(e) => handleUpdateItemStock(item.id, parseInt(e.target.value) || 0)} />
                      <button onClick={() => handleUpdateItemStock(item.id, item.stock + 1)} className="w-10 h-10 flex items-center justify-center text-emerald-500"><i className="fa-solid fa-plus"></i></button>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'STATS' && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
           <div className="bg-white border border-zinc-200 rounded-[3rem] overflow-hidden shadow-sm">
             <div className="p-8 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                <div>
                  <h2 className="font-black italic uppercase tracking-tighter text-2xl text-zinc-900 leading-none">Ranking Olímpico</h2>
                  <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-2">Classificação por mérito de moedas recebidas.</p>
                </div>
                <i className="fa-solid fa-medal text-3xl text-yellow-500"></i>
             </div>
             <div className="overflow-x-auto">
               <table className="w-full text-left">
                 <thead className="bg-zinc-50">
                   <tr>
                     <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Posição</th>
                     <th className="px-8 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em]">Colaborador</th>
                     <th className="px-4 py-5 text-[9px] font-black text-yellow-600 uppercase tracking-[0.2em] text-center">Ouro</th>
                     <th className="px-4 py-5 text-[9px] font-black text-zinc-400 uppercase tracking-[0.2em] text-center">Prata</th>
                     <th className="px-4 py-5 text-[9px] font-black text-orange-600 uppercase tracking-[0.2em] text-center">Bronze</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-100">
                   {olympicRanking.map((rank, index) => (
                     <tr key={rank.corporateId} className={`hover:bg-zinc-50/50 transition-colors ${index < 3 ? 'bg-zinc-50/20' : ''}`}>
                       <td className="px-8 py-6">
                         <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black italic ${index === 0 ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20' : index === 1 ? 'bg-zinc-400 text-black shadow-lg shadow-zinc-400/20' : index === 2 ? 'bg-orange-700 text-white shadow-lg shadow-orange-700/20' : 'bg-zinc-100 text-zinc-400'}`}>
                           {index + 1}º
                         </div>
                       </td>
                       <td className="px-8 py-6">
                         <p className="font-black text-zinc-900 uppercase italic tracking-tighter leading-none mb-1">{rank.name}</p>
                         <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{rank.corporateId}</span>
                       </td>
                       <td className="px-4 py-6 text-center">
                         <span className="text-2xl font-black text-yellow-600 italic tracking-tighter">{rank.gold}</span>
                       </td>
                       <td className="px-4 py-6 text-center">
                         <span className="text-2xl font-black text-zinc-400 italic tracking-tighter">{rank.silver}</span>
                       </td>
                       <td className="px-4 py-6 text-center">
                         <span className="text-2xl font-black text-orange-600 italic tracking-tighter">{rank.bronze}</span>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      )}

      {/* MODAL GESTÃO ITEM (NOVO OU EDITAR) */}
      {(itemToEdit || isAddingItem) && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white border border-zinc-200 rounded-[3rem] p-10 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-black text-zinc-900 italic uppercase tracking-tighter">{itemToEdit ? 'Editar Brinde' : 'Novo Brinde'}</h3>
              <button onClick={() => { setItemToEdit(null); setIsAddingItem(false); }} className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center hover:text-zinc-900 transition-colors"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <form onSubmit={handleSaveItem} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase ml-1">Nome</label>
                  <input name="name" defaultValue={itemToEdit?.name || ''} required className="w-full p-4 bg-zinc-50 border border-zinc-100 text-zinc-900 rounded-2xl outline-none font-bold focus:border-yellow-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase ml-1">Categoria</label>
                  <input name="category" defaultValue={itemToEdit?.category || ''} required className="w-full p-4 bg-zinc-50 border border-zinc-100 text-zinc-900 rounded-2xl outline-none font-bold focus:border-yellow-500" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase ml-1">Foto</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 rounded-2xl bg-zinc-50 border border-zinc-100 overflow-hidden flex items-center justify-center">
                    {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" /> : <i className="fa-solid fa-camera text-zinc-200 text-2xl"></i>}
                  </div>
                  <label className="flex-1 cursor-pointer">
                    <div className="w-full p-6 bg-zinc-50 border-2 border-dashed border-zinc-200 text-zinc-400 rounded-2xl hover:border-yellow-500 text-center uppercase text-[9px] font-black">Selecionar Foto</div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase ml-1">Custo</label>
                  <input type="number" name="cost" defaultValue={itemToEdit?.cost || 10} required className="w-full p-4 bg-zinc-50 border border-zinc-100 text-zinc-900 rounded-2xl outline-none font-black text-xl italic focus:border-yellow-500" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-zinc-400 uppercase ml-1">Estoque</label>
                  <div className="flex items-center bg-zinc-50 border border-zinc-100 rounded-2xl p-1 gap-1 h-[60px]">
                    <button type="button" onClick={() => setModalStock(Math.max(0, modalStock - 1))} className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-rose-500"><i className="fa-solid fa-minus"></i></button>
                    <input type="number" className="flex-1 bg-transparent text-center text-2xl font-black text-zinc-900 italic outline-none" value={modalStock} onChange={(e) => setModalStock(parseInt(e.target.value) || 0)}/>
                    <button type="button" onClick={() => setModalStock(modalStock + 1)} className="w-10 h-10 flex items-center justify-center text-emerald-500"><i className="fa-solid fa-plus"></i></button>
                  </div>
                </div>
              </div>
              <button type="submit" disabled={isUploading} className={`w-full py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all shadow-lg ${isUploading ? 'bg-zinc-100 text-zinc-400' : 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-yellow-500/20'}`}>
                {isUploading ? 'ENVIANDO...' : (itemToEdit ? 'SALVAR ALTERAÇÕES' : 'CADASTRAR BRINDE')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE GESTÃO DE USUÁRIO */}
      {(userToEdit || isAddingUser) && (
        <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white border border-zinc-200 rounded-[3rem] p-8 md:p-12 shadow-2xl animate-in zoom-in duration-300">
            <div className="flex justify-between items-start mb-8">
              <div><h3 className="text-3xl font-black text-zinc-900 italic uppercase tracking-tighter leading-none">{isAddingUser ? 'Novo Colaborador' : 'Gestão de Colaborador'}</h3></div>
              <button onClick={() => { setUserToEdit(null); setIsAddingUser(false); }} className="w-10 h-10 rounded-full bg-zinc-100 text-zinc-400 flex items-center justify-center hover:text-zinc-900 transition-colors"><i className="fa-solid fa-xmark"></i></button>
            </div>
            <div className="space-y-10">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest ml-2">Nome Completo</p>
                    <input type="text" className="w-full p-4 bg-zinc-50 border border-zinc-100 text-zinc-900 rounded-2xl outline-none font-bold focus:border-yellow-500" value={editUserName} onChange={e => setEditUserName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest ml-2">ID Corporativo</p>
                    <input type="text" className="w-full p-4 bg-zinc-50 border border-zinc-100 text-zinc-900 rounded-2xl outline-none font-bold focus:border-yellow-500" value={editUserId} onChange={e => setEditUserId(e.target.value)} />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <p className="text-[8px] font-black text-zinc-400 uppercase tracking-widest ml-2">Senha</p>
                    <input type="text" className="w-full p-4 bg-zinc-50 border border-zinc-100 text-zinc-900 rounded-2xl outline-none font-bold focus:border-yellow-500" value={editUserPassword} onChange={e => setEditUserPassword(e.target.value)} />
                  </div>
                </div>
                <button onClick={handleSaveUser} className="w-full px-12 py-4 bg-yellow-500 text-black rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-yellow-500/20 hover:bg-yellow-400 transition-all">SALVAR CADASTRO</button>
              </div>
              {!isAddingUser && (
                <div className="space-y-4">
                  <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1 italic">Perfil de Acesso</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {[Capability.OPERADOR, Capability.SUPERVISOR_COORDENADOR, Capability.GERENTE_AREA, Capability.GERENTE_FABRIL, Capability.GENTE_GESTAO].map(role => (
                      <button key={role} onClick={() => toggleCapability(userToEdit!, role)} className={`px-4 py-4 rounded-2xl border font-black text-[9px] uppercase tracking-widest transition-all ${userToEdit!.capabilities.includes(role) ? 'bg-zinc-900 text-white border-zinc-900 shadow-lg shadow-zinc-900/10' : 'bg-white text-zinc-400 border-zinc-200 hover:border-zinc-900'}`}>{role}</button>
                    ))}
                  </div>
                </div>
              )}
              <div className="pt-8 border-t border-zinc-100 flex justify-end">
                 <button onClick={() => { setUserToEdit(null); setIsAddingUser(false); }} className="px-12 py-4 bg-zinc-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-zinc-800 transition-all">Concluir</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;

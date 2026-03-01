
import React, { useState, useMemo } from 'react';
import { User, TransactionType, Transaction, Capability, CoinType, Wallet, PilarType } from '../types';
import { saveDB, addAuditLog, getDB } from '../store';
import { ToastType } from '../components/Toast';

interface LeadershipProps {
  user: User;
  db: any;
  onRefreshDB: () => void;
  showToast: (msg: string, type: ToastType) => void;
}

const PILARES: PilarType[] = [
  'Segurança', 'Qualidade', 'Manutenção', 'Financeiro', 
  'Logística', 'Meio Ambiente', 'Gestão', 'Gente'
];

const Leadership: React.FC<LeadershipProps> = ({ user, db, onRefreshDB, showToast }) => {
  const [recipientId, setRecipientId] = useState('');
  const [pillar, setPillar] = useState<PilarType | ''>('');
  const [amount, setAmount] = useState<string>('1');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wallet = useMemo(() => {
    return db.wallets.find((w: Wallet) => w.userId === user.id) || { donatableGold: 0, donatableSilver: 0, donatableBronze: 0 };
  }, [user.id, db.wallets]);

  const coinConfig = useMemo(() => {
    if (user.capabilities.includes(Capability.ADMIN) || user.capabilities.includes(Capability.GERENTE_FABRIL)) {
      return { type: CoinType.GOLD, weight: 3, label: 'Moeda de Ouro', color: 'text-yellow-500', stock: wallet.donatableGold || 0 };
    }
    if (user.capabilities.includes(Capability.GERENTE_AREA)) {
      return { type: CoinType.SILVER, weight: 2, label: 'Moeda de Prata', color: 'text-zinc-400', stock: wallet.donatableSilver || 0 };
    }
    return { type: CoinType.BRONZE, weight: 1, label: 'Moeda de Bronze', color: 'text-orange-600', stock: wallet.donatableBronze || 0 };
  }, [user.capabilities, wallet]);

  const activeUsers = db.users.filter((u: User) => u.status === 'ACTIVE' && u.id !== user.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const numCoins = Number(amount);
    if (numCoins > coinConfig.stock) {
      showToast(`Você não possui verba suficiente. Saldo disponível: ${coinConfig.stock} moedas.`, 'error');
      return;
    }

    if (!recipientId || !pillar || numCoins <= 0 || !reason.trim()) {
      showToast('Preencha todos os campos corretamente.', 'warning');
      return;
    }

    try {
      setIsSubmitting(true);
      const currentDb = getDB(); 
      const totalPoints = numCoins * coinConfig.weight;

      // 1. Debita da VERBA do doador
      const donorWallet = currentDb.wallets.find((w: any) => w.userId === user.id);
      if (!donorWallet) throw new Error('Carteira não encontrada');
      
      if (coinConfig.type === CoinType.GOLD) donorWallet.donatableGold -= numCoins;
      if (coinConfig.type === CoinType.SILVER) donorWallet.donatableSilver -= numCoins;
      if (coinConfig.type === CoinType.BRONZE) donorWallet.donatableBronze -= numCoins;

      // 2. Credita no SALDO PESSOAL do receptor
      let recipientWallet = currentDb.wallets.find((w: any) => w.userId === recipientId);
      if (!recipientWallet) {
        currentDb.wallets.push({ userId: recipientId, balance: 0, donatableGold: 0, donatableSilver: 0, donatableBronze: 0 });
        recipientWallet = currentDb.wallets[currentDb.wallets.length - 1];
      }
      recipientWallet.balance += totalPoints;

      const tx: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        type: TransactionType.CREDIT,
        amount: totalPoints,
        coinCount: numCoins, // Salva a quantidade real de moedas
        coinType: coinConfig.type,
        pillar: pillar as PilarType,
        fromUserId: user.id,
        toUserId: recipientId,
        reason: reason.trim(),
        category: `Reconhecimento: ${pillar}`,
        createdAt: new Date().toISOString(),
        createdBy: user.id
      };
      currentDb.transactions.unshift(tx);

      saveDB(currentDb);
      onRefreshDB();
      showToast(`Sucesso! ${numCoins} moedas enviadas.`, 'success');
      setAmount('1'); setReason(''); setRecipientId(''); setPillar('');
    } catch (error) {
      showToast('Erro ao processar envio.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      <header className="flex justify-between items-end">
        <div>
          <p className={`font-black text-[10px] uppercase tracking-[0.3em] mb-1 italic ${coinConfig.color}`}>Sua Verba Disponível: {coinConfig.stock} {coinConfig.label}s</p>
          <h1 className="text-4xl font-black text-zinc-900 italic uppercase tracking-tighter">Enviar Reconhecimento</h1>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 space-y-6 shadow-sm relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Colaborador</label>
                <select required className="w-full p-4 bg-zinc-50 border border-zinc-100 text-zinc-900 rounded-2xl appearance-none outline-none font-bold" value={recipientId} onChange={e => setRecipientId(e.target.value)}>
                  <option value="">Selecione...</option>
                  {activeUsers.map((u: User) => (<option key={u.id} value={u.id}>{u.name.toUpperCase()}</option>))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Pilar do Reconhecimento</label>
                <select required className="w-full p-4 bg-zinc-50 border border-zinc-100 text-zinc-900 rounded-2xl appearance-none outline-none font-bold" value={pillar} onChange={e => setPillar(e.target.value as PilarType)}>
                  <option value="">Selecione o Pilar...</option>
                  {PILARES.map(p => (<option key={p} value={p}>{p}</option>))}
                </select>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Qtd de Moedas</label>
                <input type="number" required min="1" max={coinConfig.stock} className={`w-full p-4 bg-zinc-50 border border-zinc-100 font-black rounded-2xl text-2xl outline-none ${coinConfig.color}`} value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div className="flex flex-col justify-center p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                 <p className="text-[10px] font-black text-zinc-400 uppercase">Impacto na Loja:</p>
                 <p className="text-3xl font-black text-zinc-900 italic tracking-tighter">+{Number(amount) * coinConfig.weight} Pts</p>
              </div>
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Motivo</label>
              <textarea required rows={4} className="w-full p-4 bg-zinc-50 border border-zinc-100 text-zinc-900 rounded-2xl outline-none placeholder:text-zinc-300" placeholder="Por que este colaborador merece?" value={reason} onChange={e => setReason(e.target.value)}></textarea>
            </div>
            <button type="submit" disabled={isSubmitting || coinConfig.stock === 0} className={`w-full py-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-lg ${isSubmitting || coinConfig.stock === 0 ? 'bg-zinc-100 text-zinc-300 cursor-not-allowed border border-zinc-200' : 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-yellow-500/20'}`}>
              {coinConfig.stock === 0 ? 'SEM VERBA DISPONÍVEL' : 'CONFIRMAR RECONHECIMENTO'}
            </button>
          </form>
        </div>
        <div className="lg:col-span-2 space-y-4">
           <div className="p-8 rounded-[2.5rem] bg-white border border-zinc-200 shadow-sm">
              <h4 className="font-black text-zinc-900 uppercase italic text-xl mb-4 tracking-tighter">Como funciona?</h4>
              <p className="text-xs text-zinc-500 font-medium leading-relaxed">
                Você recebeu esta verba do administrador. Quando você doa moedas, elas são convertidas em <strong>Pontos de Compra</strong> para o colaborador, permitindo que ele resgate brindes na loja.
                <br/><br/>
                O reconhecimento deve estar associado a um dos <strong>8 Pilares Estratégicos</strong> da nossa unidade.
              </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Leadership;

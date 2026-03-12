
import React, { useState } from 'react';
import { User, CompanyPrinciple, Recognition, Capability } from '../types';
import { saveDB, addAuditLog, getDB } from '../store';

interface RecognitionProps {
  user: User;
  db: any;
  onRefreshDB: () => void;
  showToast: (msg: string, type?: any) => void;
}

const RecognitionPage: React.FC<RecognitionProps> = ({ user, db, onRefreshDB, showToast }) => {
  const [targetUserId, setTargetUserId] = useState('');
  const [principle, setPrinciple] = useState<CompanyPrinciple | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const principles = Object.values(CompanyPrinciple);
  const otherUsers = db.users.filter((u: User) => u.id !== user.id);

  const handleSendRecognition = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUserId || !principle) return showToast('Selecione uma pessoa e um princípio.', 'warning');

    setIsSubmitting(true);
    const currentDb = getDB();
    const newRecognition: Recognition = {
      id: Math.random().toString(36).substr(2, 9),
      fromUserId: user.id,
      toUserId: targetUserId,
      principle: principle as CompanyPrinciple,
      createdAt: new Date().toISOString(),
      isRead: false
    };

    currentDb.recognitions = [newRecognition, ...(currentDb.recognitions || [])];
    
    addAuditLog(currentDb, {
      actorUserId: user.id,
      action: 'SEND_RECOGNITION',
      entityType: 'RECOGNITION',
      entityId: newRecognition.id,
      details: { toUserId: targetUserId, principle }
    });

    saveDB(currentDb);
    onRefreshDB();
    setTargetUserId('');
    setPrinciple('');
    setIsSubmitting(false);
    showToast('Reconhecimento enviado com sucesso!', 'success');
  };

  const myReceivedRecognitions = (db.recognitions || []).filter((r: Recognition) => r.toUserId === user.id);
  const mySentRecognitions = (db.recognitions || []).filter((r: Recognition) => r.fromUserId === user.id);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-3xl font-black text-zinc-900 italic uppercase tracking-tighter leading-none mb-2">Reconhecimento</h1>
        <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-[10px] italic">Reconheça seus colegas pelos princípios da nossa cultura.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <section className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white">
                <i className="fa-solid fa-medal text-sm"></i>
              </div>
              <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest italic">Enviar Reconhecimento</h2>
            </div>

            <form onSubmit={handleSendRecognition} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Para quem?</label>
                <select 
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
                >
                  <option value="">Selecione uma pessoa...</option>
                  {otherUsers.map((u: User) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.corporateId})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Qual princípio?</label>
                <select 
                  value={principle}
                  onChange={(e) => setPrinciple(e.target.value as CompanyPrinciple)}
                  className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all appearance-none"
                >
                  <option value="">Selecione um princípio...</option>
                  {principles.map((p, idx) => (
                    <option key={idx} value={p}>{idx + 1}. {p}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-500 text-white font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? <i className="fa-solid fa-spinner fa-spin"></i> : <i className="fa-solid fa-paper-plane"></i>}
                  {isSubmitting ? 'Enviando...' : 'Enviar Reconhecimento'}
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic flex items-center gap-2 px-2">
              <i className="fa-solid fa-history text-[8px]"></i> Histórico de Reconhecimentos Recebidos
            </h3>

            <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-100">
                      <th className="px-6 py-4 text-left text-[8px] font-black text-zinc-400 uppercase tracking-widest">Data</th>
                      <th className="px-6 py-4 text-left text-[8px] font-black text-zinc-400 uppercase tracking-widest">De</th>
                      <th className="px-6 py-4 text-left text-[8px] font-black text-zinc-400 uppercase tracking-widest">Princípio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {myReceivedRecognitions.length > 0 ? myReceivedRecognitions.map((r: Recognition) => {
                      const sender = db.users.find((u: User) => u.id === r.fromUserId);
                      return (
                        <tr key={r.id} className="hover:bg-zinc-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="text-[10px] font-bold text-zinc-500">{new Date(r.createdAt).toLocaleDateString()}</p>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                                <i className="fa-solid fa-user text-[8px]"></i>
                              </div>
                              <span className="text-[9px] font-black text-zinc-900 uppercase">{sender?.name || 'Desconhecido'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[10px] font-bold text-zinc-600 italic">"{r.principle}"</p>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr>
                        <td colSpan={3} className="p-16 text-center">
                          <i className="fa-solid fa-medal text-zinc-100 text-4xl mb-3 block"></i>
                          <p className="text-zinc-300 font-black uppercase text-[9px] tracking-widest italic">Você ainda não recebeu reconhecimentos.</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="bg-zinc-900 text-white p-8 rounded-[2rem] shadow-xl shadow-zinc-900/20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
            <div className="relative z-10">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 mb-2">Sua Cultura</p>
              <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-6">Impacto</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Recebidos</span>
                  <span className="text-2xl font-black italic text-emerald-400">{myReceivedRecognitions.length}</span>
                </div>
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Enviados</span>
                  <span className="text-2xl font-black italic text-zinc-100">{mySentRecognitions.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-zinc-100 shadow-sm">
            <h4 className="text-[10px] font-black text-zinc-900 uppercase tracking-widest mb-4 italic">Breakdown por Cultura</h4>
            <div className="space-y-3">
              {principles.map((p, i) => {
                const count = myReceivedRecognitions.filter((r: Recognition) => r.principle === p).length;
                return (
                  <div key={i} className="flex flex-col gap-1 group">
                    <div className="flex justify-between items-center">
                      <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">Princípio {i + 1}</span>
                      <span className="text-[10px] font-black text-zinc-900">{count}</span>
                    </div>
                    <p className="text-[9px] font-bold text-zinc-400 leading-tight group-hover:text-zinc-600 transition-colors">{p}</p>
                    <div className="w-full h-1 bg-zinc-50 rounded-full overflow-hidden mt-1">
                      <div 
                        className="h-full bg-emerald-500 transition-all duration-1000" 
                        style={{ width: `${myReceivedRecognitions.length > 0 ? (count / myReceivedRecognitions.length) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default RecognitionPage;

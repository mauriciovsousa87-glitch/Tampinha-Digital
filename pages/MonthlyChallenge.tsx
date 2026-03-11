
import React, { useState } from 'react';
import { User, MonthlyChallenge, Capability, ChallengeStatus } from '../types';

interface MonthlyChallengeProps {
  user: User;
  db: any;
  onRefreshDB: () => void;
  showToast: (msg: string, type?: any) => void;
}

const MonthlyChallengePage: React.FC<MonthlyChallengeProps> = ({ user, db, onRefreshDB, showToast }) => {
  const [kpi, setKpi] = useState('');
  const [meta, setMeta] = useState('');
  const [area, setArea] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [monthFilter, setMonthFilter] = useState('');

  const isLider = user.capabilities.some(c => [
    Capability.SUPERVISOR_COORDENADOR, 
    Capability.GERENTE_AREA, 
    Capability.GERENTE_FABRIL, 
    Capability.GENTE_GESTAO,
    Capability.LEADERSHIP,
    Capability.ADMIN
  ].includes(c));

  const isAdminOrGenteGestao = user.capabilities.some(c => [
    Capability.GENTE_GESTAO,
    Capability.ADMIN
  ].includes(c));

  const handleCreateChallenge = (e: React.FormEvent) => {
    e.preventDefault();
    if (!kpi || !meta || !area) return showToast('Preencha todos os campos.', 'warning');

    setIsSubmitting(true);
    const newChallenge: MonthlyChallenge = {
      id: Math.random().toString(36).substr(2, 9),
      area,
      kpi,
      meta,
      status: ChallengeStatus.PENDING,
      isMetaHit: false,
      createdAt: new Date().toISOString(),
      createdBy: user.id
    };

    const updatedDB = { ...db, challenges: [newChallenge, ...(db.challenges || [])] };
    localStorage.setItem('tampinhas_digital_v1', JSON.stringify(updatedDB));
    onRefreshDB();
    setKpi('');
    setMeta('');
    setArea('');
    setIsSubmitting(false);
    showToast('Desafio registrado e enviado para aprovação!', 'success');
  };

  const filteredChallenges = (db.challenges || []).filter((c: MonthlyChallenge) => {
    // Visibility check: Only management/admin see everything, others see only their own
    const canSee = isAdminOrGenteGestao || c.createdBy === user.id;
    if (!canSee) return false;

    // Month filter check
    if (monthFilter) {
      const challengeDate = new Date(c.createdAt);
      const [year, month] = monthFilter.split('-');
      return challengeDate.getFullYear() === parseInt(year) && (challengeDate.getMonth() + 1) === parseInt(month);
    }

    return true;
  });

  // Generate unique months from challenges for the filter
  const availableMonths = (Array.from(new Set((db.challenges || []).map((c: MonthlyChallenge) => {
    const d = new Date(c.createdAt);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  }))) as string[]).sort().reverse();

  const getMonthName = (monthStr: string) => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <header>
        <h1 className="text-3xl font-black text-zinc-900 italic uppercase tracking-tighter leading-none mb-2">Desafio Mensal</h1>
        <p className="text-zinc-400 font-bold uppercase tracking-[0.2em] text-[10px] italic">Registro e acompanhamento dos desafios da cervejaria.</p>
      </header>

      {isLider && (
        <section className="bg-white p-8 rounded-[2rem] border border-zinc-100 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-yellow-500 flex items-center justify-center text-black">
              <i className="fa-solid fa-plus text-sm"></i>
            </div>
            <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest italic">Registrar Novo Desafio</h2>
          </div>

          <form onSubmit={handleCreateChallenge} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Área</label>
              <input 
                type="text" 
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="Ex: Envase, Filtração..."
                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Indicador (KPI)</label>
              <input 
                type="text" 
                value={kpi}
                onChange={(e) => setKpi(e.target.value)}
                placeholder="Ex: Eficiência de Linha..."
                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Meta</label>
              <input 
                type="text" 
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                placeholder="Ex: > 85%, < 1.5%..."
                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl p-4 text-sm font-bold text-zinc-900 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-all"
              />
            </div>
            <div className="md:col-span-3 flex justify-end">
              <button 
                type="submit"
                disabled={isSubmitting}
                className="bg-yellow-500 text-black font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl shadow-lg shadow-yellow-500/20 hover:scale-105 transition-all active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? 'Registrando...' : 'Registrar Desafio'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2">
          <h3 className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.3em] italic flex items-center gap-2">
            <i className="fa-solid fa-history text-[8px]"></i> Histórico de Desafios
          </h3>

          <div className="flex items-center gap-3">
            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Filtrar Mês:</label>
            <select 
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-white border border-zinc-200 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/20 transition-all"
            >
              <option value="">Todos os meses</option>
              {availableMonths.map(m => (
                <option key={m} value={m}>{getMonthName(m)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-zinc-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-zinc-50 border-b border-zinc-100">
                  <th className="px-6 py-4 text-left text-[8px] font-black text-zinc-400 uppercase tracking-widest">Data</th>
                  <th className="px-6 py-4 text-left text-[8px] font-black text-zinc-400 uppercase tracking-widest">Área</th>
                  <th className="px-6 py-4 text-left text-[8px] font-black text-zinc-400 uppercase tracking-widest">KPI</th>
                  <th className="px-6 py-4 text-left text-[8px] font-black text-zinc-400 uppercase tracking-widest">Meta</th>
                  <th className="px-6 py-4 text-left text-[8px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-left text-[8px] font-black text-zinc-400 uppercase tracking-widest">Meta Batida?</th>
                  <th className="px-6 py-4 text-left text-[8px] font-black text-zinc-400 uppercase tracking-widest">Registrado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredChallenges.length > 0 ? filteredChallenges.map((c: MonthlyChallenge) => {
                  const creator = db.users.find((u: User) => u.id === c.createdBy);
                  return (
                    <tr key={c.id} className="hover:bg-zinc-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-[10px] font-bold text-zinc-500">{new Date(c.createdAt).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[11px] font-black text-zinc-900 uppercase italic">{c.area}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[11px] font-black text-zinc-900 uppercase italic">{c.kpi}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-[11px] font-black text-yellow-600 italic">{c.meta}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border ${
                          c.status === ChallengeStatus.PENDING ? 'bg-yellow-50 text-yellow-600 border-yellow-200' :
                          c.status === ChallengeStatus.APPROVED ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                          'bg-rose-50 text-rose-600 border-rose-200'
                        }`}>
                          {c.status === ChallengeStatus.PENDING ? 'Pendente' :
                           c.status === ChallengeStatus.APPROVED ? 'Aprovado' : 'Reprovado'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {c.isMetaHit ? (
                          <span className="text-[8px] font-black uppercase px-2 py-1 rounded-lg bg-emerald-500 text-white border border-emerald-600 shadow-sm">
                            <i className="fa-solid fa-check mr-1"></i> Batida
                          </span>
                        ) : (
                          <span className="text-[8px] font-black uppercase px-2 py-1 rounded-lg bg-zinc-100 text-zinc-400 border border-zinc-200">
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400">
                            <i className="fa-solid fa-user text-[8px]"></i>
                          </div>
                          <span className="text-[9px] font-black text-zinc-400 uppercase">{creator?.name || 'Desconhecido'}</span>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} className="p-16 text-center">
                      <i className="fa-solid fa-bullseye text-zinc-100 text-4xl mb-3 block"></i>
                      <p className="text-zinc-300 font-black uppercase text-[9px] tracking-widest italic">Nenhum desafio encontrado.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
};

export default MonthlyChallengePage;

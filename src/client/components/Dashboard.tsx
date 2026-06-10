import { useState, useMemo, useEffect } from 'react';
import {
  Plus, Trash2, TrendingUp, Snowflake, Zap, Calendar,
  AlertCircle, CheckCircle2, Wallet, CreditCard,
  Briefcase, Receipt, PiggyBank, Activity, Loader2
} from 'lucide-react';
import { financeApi } from '../lib/api';
import { fmtCurrency, fmtPercent, fmtMonths } from '../lib/format';
import { Card, Eyebrow, SectionHeader, Button, TextInput, CurrencyInput, PercentInput, Pill } from './ui';

interface Income  { id: string; source: string; amount: number; }
interface Expense { id: string; name: string;   amount: number; }
interface Debt    { id: string; name: string; balance: number; apr: number; minPayment: number; }
type Strategy = 'avalanche' | 'snowball';

export default function Dashboard() {
  const [loading,   setLoading]   = useState(true);
  const [incomes,   setIncomes]   = useState<Income[]>([]);
  const [expenses,  setExpenses]  = useState<Expense[]>([]);
  const [debts,     setDebts]     = useState<Debt[]>([]);
  const [strategy,  setStrategy]  = useState<Strategy>('avalanche');

  useEffect(() => {
    financeApi.getState()
      .then(state => {
        setIncomes(state.incomes.map(i => ({ ...i, amount: Number(i.amount) })));
        setExpenses(state.expenses.map(e => ({ ...e, amount: Number(e.amount) })));
        setDebts(state.debts.map(d => ({ ...d, balance: Number(d.balance), apr: Number(d.apr), minPayment: Number(d.minPayment) })));
        setStrategy(state.strategy);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalIncome      = useMemo(() => incomes.reduce((s, i)  => s + (Number(i.amount) || 0), 0),   [incomes]);
  const totalExpenses    = useMemo(() => expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0),   [expenses]);
  const totalMinPayments = useMemo(() => debts.reduce((s, d)   => s + (Number(d.minPayment) || 0), 0),[debts]);
  const totalDebt        = useMemo(() => debts.reduce((s, d)   => s + (Number(d.balance) || 0), 0),   [debts]);
  const disposable       = totalIncome - totalExpenses - totalMinPayments;

  const weightedAPR = useMemo(() => {
    if (totalDebt === 0) return 0;
    return debts.reduce((s, d) => s + Number(d.balance) * Number(d.apr), 0) / totalDebt;
  }, [debts, totalDebt]);

  const prioritized = useMemo(() => {
    const active = debts.filter(d => Number(d.balance) > 0);
    return strategy === 'avalanche'
      ? [...active].sort((a, b) => Number(b.apr) - Number(a.apr))
      : [...active].sort((a, b) => Number(a.balance) - Number(b.balance));
  }, [debts, strategy]);

  const payoffMonths = useMemo(() => {
    if (debts.length === 0 || disposable < 0 || totalDebt === 0) return null;
    let sim = debts.map(d => ({ id: d.id, balance: Number(d.balance), apr: Number(d.apr), minPayment: Number(d.minPayment) }));
    let months = 0;
    const extra = Math.max(0, disposable);
    while (sim.some(d => d.balance > 0.01) && months < 600) {
      months++;
      sim = sim.map(d => d.balance <= 0 ? d : { ...d, balance: d.balance * (1 + d.apr / 100 / 12) });
      sim = sim.map(d => d.balance <= 0 ? d : { ...d, balance: d.balance - Math.min(d.minPayment, d.balance) });
      let e = extra;
      const active = sim.filter(d => d.balance > 0);
      const order  = strategy === 'avalanche' ? [...active].sort((a, b) => b.apr - a.apr) : [...active].sort((a, b) => a.balance - b.balance);
      for (const d of order) {
        if (e <= 0) break;
        const idx = sim.findIndex(x => x.id === d.id);
        const pay = Math.min(e, sim[idx].balance);
        sim[idx].balance -= pay; e -= pay;
      }
    }
    return months >= 600 ? null : months;
  }, [debts, disposable, strategy, totalDebt]);

  // ── Handlers ──
  const addIncome    = async () => { const r = await financeApi.createIncome({ source: '', amount: 0 }); setIncomes(p => [...p, { ...r, amount: Number(r.amount) }]); };
  const updateIncome = (id: string, field: keyof Income, value: any) => { setIncomes(p => p.map(i => i.id === id ? { ...i, [field]: value } : i)); financeApi.updateIncome(id, { [field]: value }).catch(console.error); };
  const removeIncome = (id: string) => { setIncomes(p => p.filter(i => i.id !== id)); financeApi.deleteIncome(id).catch(console.error); };

  const addExpense    = async () => { const r = await financeApi.createExpense({ name: '', amount: 0 }); setExpenses(p => [...p, { ...r, amount: Number(r.amount) }]); };
  const updateExpense = (id: string, field: keyof Expense, value: any) => { setExpenses(p => p.map(e => e.id === id ? { ...e, [field]: value } : e)); financeApi.updateExpense(id, { [field]: value }).catch(console.error); };
  const removeExpense = (id: string) => { setExpenses(p => p.filter(e => e.id !== id)); financeApi.deleteExpense(id).catch(console.error); };

  const addDebt    = async () => { const r = await financeApi.createDebt({ name: '', balance: 0, apr: 0, minPayment: 0 }); setDebts(p => [...p, { ...r, balance: Number(r.balance), apr: Number(r.apr), minPayment: Number(r.minPayment) }]); };
  const updateDebt = (id: string, field: keyof Debt, value: any) => { setDebts(p => p.map(d => d.id === id ? { ...d, [field]: value } : d)); financeApi.updateDebt(id, { [field]: value }).catch(console.error); };
  const removeDebt = (id: string) => { setDebts(p => p.filter(d => d.id !== id)); financeApi.deleteDebt(id).catch(console.error); };

  const switchStrategy = (s: Strategy) => { setStrategy(s); financeApi.setPreferences({ strategy: s }).catch(console.error); };

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-5 md:px-10 py-10 md:py-14">

      {/* Page header */}
      <header className="mb-12">
        <p className="eyebrow mb-3">Overview</p>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.05] text-ink-900 dark:text-white">
          Your payoff plan.
        </h1>
        <p className="text-sm text-ink-500 dark:text-white/40 mt-3 max-w-xl font-light leading-relaxed">
          A clear monthly playbook for eliminating debt and maximising every dollar of disposable income.
        </p>
      </header>

      {/* Stat tiles */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-10">
        <StatTile icon={<Wallet className="w-4 h-4" />}   label="Monthly Income"  value={fmtCurrency(totalIncome)}   sub={`${incomes.length} stream${incomes.length !== 1 ? 's' : ''}`}           accent="emerald" />
        <StatTile icon={<CreditCard className="w-4 h-4" />} label="Total Debt"    value={fmtCurrency(totalDebt)}     sub={`${debts.length} account${debts.length !== 1 ? 's' : ''}`}             accent="rose" />
        <StatTile icon={<Activity className="w-4 h-4" />}   label="Weighted APR"  value={fmtPercent(weightedAPR)}    sub="Cost of capital"                                                        accent="amber" />
        <StatTile icon={<Calendar className="w-4 h-4" />}   label="Debt-Free In"  value={fmtMonths(payoffMonths)}    sub={`${strategy} pace`}                                                     accent="sky" />
      </section>

      {/* Cash flow waterfall */}
      <Card className="mb-8" padded={false}>
        <div className="p-6 pb-5">
          <SectionHeader eyebrow="Cash Flow" title="Monthly waterfall"
            icon={<PiggyBank className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />}
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-ink-100 dark:bg-white/[0.06] border-t border-ink-100 dark:border-white/[0.06]">
          <WaterfallCell label="Income"        value={totalIncome}      positive />
          <WaterfallCell label="− Expenses"    value={totalExpenses} />
          <WaterfallCell label="− Min Payments" value={totalMinPayments} />
          <WaterfallCell label="= Disposable"  value={disposable}       highlight />
        </div>
        {disposable < 0 && (
          <div className="mx-6 mt-4 mb-6 flex items-start gap-2.5 text-xs bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-lg p-3.5 text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>You're <strong>{fmtCurrency(Math.abs(disposable))}</strong> short each month. Reduce expenses or increase income before any payoff strategy can work.</span>
          </div>
        )}
      </Card>

      {/* Strategy */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-4">
          <div>
            <p className="eyebrow mb-2">Strategy</p>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">This month's playbook.</h2>
          </div>
          <div className="inline-flex rounded-lg border border-ink-200 dark:border-white/10 bg-white dark:bg-ink-900 p-1">
            <button onClick={() => switchStrategy('avalanche')}
              className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all tracking-wide ${
                strategy === 'avalanche' ? 'bg-ink-900 dark:bg-white text-white dark:text-ink-900 shadow-sm' : 'text-ink-500 dark:text-white/40 hover:text-ink-800 dark:hover:text-white'
              }`}>
              <Zap className="w-3.5 h-3.5" />Avalanche
            </button>
            <button onClick={() => switchStrategy('snowball')}
              className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-1.5 transition-all tracking-wide ${
                strategy === 'snowball' ? 'bg-sky-700 dark:bg-sky-500 text-white shadow-sm' : 'text-ink-500 dark:text-white/40 hover:text-ink-800 dark:hover:text-white'
              }`}>
              <Snowflake className="w-3.5 h-3.5" />Snowball
            </button>
          </div>
        </div>

        <Card>
          <p className="text-sm text-ink-600 dark:text-white/60 leading-relaxed pb-5 mb-5 border-b border-ink-100 dark:border-white/[0.06]">
            {strategy === 'avalanche'
              ? <>Pay every minimum, then route <strong className="text-emerald-700 dark:text-emerald-400 font-bold">{fmtCurrency(Math.max(0, disposable))}</strong> of extra cash into the <strong className="font-bold">highest-rate</strong> debt first. Mathematically the cheapest path — minimises total interest paid.</>
              : <>Pay every minimum, then route <strong className="text-sky-700 dark:text-sky-400 font-bold">{fmtCurrency(Math.max(0, disposable))}</strong> of extra cash into the <strong className="font-bold">smallest balance</strong> first. Faster psychological wins, slower mathematically.</>}
          </p>

          {prioritized.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-xl font-bold text-ink-800 dark:text-white">You're debt free.</p>
              <p className="text-sm text-ink-500 dark:text-white/40 mt-1 font-light">Time to invest, save, or plan a mortgage.</p>
            </div>
          ) : (
            <ol className="space-y-2.5">
              {prioritized.map((debt, idx) => {
                const isFirst    = idx === 0;
                const extra      = isFirst ? Math.max(0, disposable) : 0;
                const totalPay   = (Number(debt.minPayment) || 0) + extra;
                return (
                  <li key={debt.id} className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    isFirst
                      ? strategy === 'avalanche'
                        ? 'bg-emerald-50 dark:bg-emerald-500/[0.07] border-emerald-500/30 dark:border-emerald-500/20'
                        : 'bg-sky-50 dark:bg-sky-500/[0.07] border-sky-500/30 dark:border-sky-500/20'
                      : 'bg-ink-50/50 dark:bg-white/[0.02] border-ink-100 dark:border-white/[0.06]'
                  }`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      isFirst
                        ? strategy === 'avalanche' ? 'bg-emerald-600 text-white' : 'bg-sky-600 text-white'
                        : 'bg-ink-200 dark:bg-white/10 text-ink-500 dark:text-white/50'
                    }`}>{idx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-ink-900 dark:text-white">{debt.name || 'Unnamed debt'}</p>
                        {isFirst && <Pill tone={strategy === 'avalanche' ? 'emerald' : 'sky'}>Attack first</Pill>}
                      </div>
                      <p className="text-xs mt-0.5 font-numeric tabular text-ink-400 dark:text-white/30">
                        {fmtCurrency(debt.balance)} · {fmtPercent(debt.apr)} APR
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="eyebrow mb-0.5">Pay this month</p>
                      <p className={`font-numeric tabular text-xl font-bold ${
                        isFirst
                          ? strategy === 'avalanche' ? 'text-emerald-700 dark:text-emerald-400' : 'text-sky-700 dark:text-sky-400'
                          : 'text-ink-700 dark:text-white/70'
                      }`}>{fmtCurrency(totalPay)}</p>
                      {isFirst && extra > 0 && (
                        <p className="text-[10px] text-ink-400 dark:text-white/30 font-numeric tabular mt-0.5">
                          min {fmtCurrency(debt.minPayment)} + {fmtCurrency(extra)}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>
      </section>

      {/* Debt allocation */}
      {totalDebt > 0 && (
        <Card className="mb-8">
          <SectionHeader eyebrow="Distribution" title="Debt allocation"
            icon={<TrendingUp className="w-4 h-4 text-ink-400" strokeWidth={2} />}
          />
          <div className="flex w-full h-2 rounded-full overflow-hidden mb-5 bg-ink-100 dark:bg-white/[0.06]">
            {debts.filter(d => Number(d.balance) > 0).map((d, i) => {
              const pct    = (Number(d.balance) / totalDebt) * 100;
              const colors = ['bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-pink-500'];
              return <div key={d.id} className={colors[i % colors.length]} style={{ width: `${pct}%` }} title={`${d.name}: ${pct.toFixed(1)}%`} />;
            })}
          </div>
          <div className="space-y-2">
            {debts.filter(d => Number(d.balance) > 0).map((d, i) => {
              const pct    = (Number(d.balance) / totalDebt) * 100;
              const colors = ['bg-emerald-500', 'bg-sky-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-pink-500'];
              return (
                <div key={d.id} className="flex items-center gap-3 text-sm">
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${colors[i % colors.length]}`} />
                  <span className="flex-1 text-ink-700 dark:text-white/70 font-light">{d.name}</span>
                  <span className="text-ink-400 dark:text-white/30 font-mono text-xs tabular w-14 text-right">{pct.toFixed(1)}%</span>
                  <span className="font-numeric tabular text-sm w-24 text-right font-medium">{fmtCurrency(d.balance)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Editors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
        <Card>
          <SectionHeader eyebrow="Inflows" title="Income streams"
            icon={<Briefcase className="w-4 h-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />}
            right={<Button variant="secondary" size="sm" onClick={addIncome}><Plus className="w-3 h-3" />Add</Button>}
          />
          <div className="space-y-2.5">
            {incomes.length === 0 && <EmptyHint text="No income streams yet." />}
            {incomes.map(inc => (
              <div key={inc.id} className="flex gap-2 items-center">
                <TextInput value={inc.source} onChange={e => updateIncome(inc.id, 'source', e.target.value)} placeholder="Source name" accent="emerald" className="flex-1" />
                <div className="w-32"><CurrencyInput value={inc.amount} onChange={v => updateIncome(inc.id, 'amount', v)} accent="emerald" /></div>
                <Button variant="danger" size="sm" onClick={() => removeIncome(inc.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeader eyebrow="Outflows" title="Living expenses"
            icon={<Receipt className="w-4 h-4 text-amber-600 dark:text-amber-400" strokeWidth={2} />}
            right={<Button variant="secondary" size="sm" onClick={addExpense}><Plus className="w-3 h-3" />Add</Button>}
          />
          <div className="space-y-2.5">
            {expenses.length === 0 && <EmptyHint text="No expenses tracked yet." />}
            {expenses.map(exp => (
              <div key={exp.id} className="flex gap-2 items-center">
                <TextInput value={exp.name} onChange={e => updateExpense(exp.id, 'name', e.target.value)} placeholder="Category" accent="amber" className="flex-1" />
                <div className="w-32"><CurrencyInput value={exp.amount} onChange={v => updateExpense(exp.id, 'amount', v)} accent="amber" /></div>
                <Button variant="danger" size="sm" onClick={() => removeExpense(exp.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeader eyebrow="Liabilities" title="Debt ledger"
          icon={<CreditCard className="w-4 h-4 text-rose-600 dark:text-rose-400" strokeWidth={2} />}
          right={<Button variant="secondary" size="sm" onClick={addDebt}><Plus className="w-3 h-3" />Add</Button>}
        />
        <div className="space-y-2.5">
          <div className="hidden md:grid grid-cols-12 gap-2 px-1 pb-2">
            <Eyebrow className="col-span-4">Name</Eyebrow>
            <Eyebrow className="col-span-3">Balance</Eyebrow>
            <Eyebrow className="col-span-2">APR</Eyebrow>
            <Eyebrow className="col-span-2">Minimum</Eyebrow>
          </div>
          {debts.length === 0 && <EmptyHint text="No debts. Add one to start planning." />}
          {debts.map(debt => (
            <div key={debt.id} className="grid grid-cols-12 gap-2 items-center">
              <div className="col-span-12 md:col-span-4">
                <TextInput value={debt.name} onChange={e => updateDebt(debt.id, 'name', e.target.value)} placeholder="e.g. Credit Card" accent="rose" />
              </div>
              <div className="col-span-4 md:col-span-3"><CurrencyInput value={debt.balance}    onChange={v => updateDebt(debt.id, 'balance', v)}    accent="rose" /></div>
              <div className="col-span-4 md:col-span-2"><PercentInput  value={debt.apr}        onChange={v => updateDebt(debt.id, 'apr', v)}        accent="rose" /></div>
              <div className="col-span-3 md:col-span-2"><CurrencyInput value={debt.minPayment} onChange={v => updateDebt(debt.id, 'minPayment', v)} accent="rose" /></div>
              <div className="col-span-1 flex justify-center">
                <Button variant="danger" size="sm" onClick={() => removeDebt(debt.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <footer className="mt-10 pt-6 border-t border-ink-100 dark:border-white/[0.06] text-xs text-ink-400 dark:text-white/25 flex items-center justify-between flex-wrap gap-2 font-light">
        <span>Estimates assume disposable income stays constant and no new debt is incurred.</span>
        <span className="font-semibold uppercase tracking-widest text-[10px]">{strategy}</span>
      </footer>
    </div>
  );
}

// ── Sub-components ──

function StatTile({ icon, label, value, sub, accent }: {
  icon: React.ReactNode; label: string; value: string; sub: string;
  accent: 'emerald' | 'rose' | 'amber' | 'sky';
}) {
  const accents = {
    emerald: 'text-emerald-600 dark:text-emerald-400',
    rose:    'text-rose-600 dark:text-rose-400',
    amber:   'text-amber-600 dark:text-amber-400',
    sky:     'text-sky-600 dark:text-sky-400',
  };
  return (
    <div className="bg-white dark:bg-ink-900 border border-ink-100 dark:border-white/[0.07] rounded-xl p-4 md:p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={accents[accent]}>{icon}</div>
        <Eyebrow>{label}</Eyebrow>
      </div>
      <p className="font-numeric tabular text-2xl md:text-[28px] font-bold leading-none text-ink-900 dark:text-white">{value}</p>
      <p className="text-[11px] text-ink-400 dark:text-white/30 mt-1.5 font-light">{sub}</p>
    </div>
  );
}

function WaterfallCell({ label, value, positive, highlight }: {
  label: string; value: number; positive?: boolean; highlight?: boolean;
}) {
  const neg = value < 0;
  let bg   = 'bg-white dark:bg-ink-900/40';
  let tone = 'text-ink-800 dark:text-white/80';
  if (highlight) { bg = neg ? 'bg-rose-50 dark:bg-rose-500/[0.07]' : 'bg-emerald-50 dark:bg-emerald-500/[0.07]'; tone = neg ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'; }
  else if (positive) tone = 'text-emerald-700 dark:text-emerald-400';
  return (
    <div className={`${bg} p-4 md:p-5`}>
      <Eyebrow className="mb-1.5">{label}</Eyebrow>
      <p className={`font-numeric tabular text-xl md:text-2xl font-bold ${tone}`}>{fmtCurrency(value)}</p>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return <p className="text-xs text-ink-400 dark:text-white/25 italic py-2 px-1 font-light">{text}</p>;
}

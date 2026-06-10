import { useState, useMemo } from 'react';
import { Home, TrendingUp, Calculator, Info, ChevronDown, Shield, Activity } from 'lucide-react';
import { fmtCurrency } from '../lib/format';
import { Card, Eyebrow, SectionHeader, CurrencyInput, PercentInput } from './ui';

// ─────────────────────────────────────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────────────────────────────────────

type Frequency = 'monthly' | 'semi-monthly' | 'bi-weekly' | 'accel-bi-weekly' | 'weekly' | 'accel-weekly';
type HomeType = 'first' | 'second' | 'investment';
type Tab = 'calculator' | 'affordability';

const FREQ_LABELS: Record<Frequency, string> = {
  'accel-weekly':    'Accelerated weekly',
  'weekly':          'Weekly',
  'accel-bi-weekly': 'Accelerated bi-weekly',
  'bi-weekly':       'Bi-weekly',
  'semi-monthly':    'Semi-monthly',
  'monthly':         'Monthly',
};

const FREQ_PER_YEAR: Record<Frequency, number> = {
  'accel-weekly':    52,
  'weekly':          52,
  'accel-bi-weekly': 26,
  'bi-weekly':       26,
  'semi-monthly':    24,
  'monthly':         12,
};

// ─────────────────────────────────────────────────────────────────────────────
// Canadian mortgage math — semi-annual compounding (Interest Act requirement)
// ─────────────────────────────────────────────────────────────────────────────

function effectiveMonthlyRate(annual: number): number {
  if (annual <= 0) return 0;
  return Math.pow(1 + annual / 100 / 2, 1 / 6) - 1;
}

function ratePerPeriod(annual: number, freq: Frequency): number {
  const monthly = effectiveMonthlyRate(annual);
  return Math.pow(1 + monthly, 12 / FREQ_PER_YEAR[freq]) - 1;
}

function calcPayment(principal: number, r: number, n: number): number {
  if (principal <= 0 || n <= 0) return 0;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

// Accelerated: use half/quarter of monthly payment — pays ~1 extra month/yr
function calcBasePayment(principal: number, annual: number, freq: Frequency, amortMonths: number): number {
  if (principal <= 0 || amortMonths <= 0) return 0;
  if (freq === 'accel-bi-weekly')
    return calcPayment(principal, effectiveMonthlyRate(annual), amortMonths) / 2;
  if (freq === 'accel-weekly')
    return calcPayment(principal, effectiveMonthlyRate(annual), amortMonths) / 4;
  const n = Math.round((amortMonths / 12) * FREQ_PER_YEAR[freq]);
  return calcPayment(principal, ratePerPeriod(annual, freq), n);
}

// Canadian minimum down payment rules
function minDownPayment(price: number): number {
  if (price <= 500_000) return price * 0.05;
  if (price < 1_000_000) return 25_000 + (price - 500_000) * 0.10;
  return price * 0.20;
}

// CMHC insurance premium rate
function cmhcRate(price: number, dp: number): number {
  if (price >= 1_000_000 || dp / price >= 0.20) return 0;
  const ltv = (price - dp) / price;
  if (ltv <= 0.85) return 0.028;
  if (ltv <= 0.90) return 0.031;
  return 0.040;
}

// ─────────────────────────────────────────────────────────────────────────────
// Root component — tab shell
// ─────────────────────────────────────────────────────────────────────────────

export default function MortgageCalculator() {
  const [tab, setTab] = useState<Tab>('calculator');

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">

      <header className="mb-8">
        <Eyebrow>Tools</Eyebrow>
        <h1 className="display text-4xl md:text-5xl mt-2 leading-[1.05]">
          Mortgage <span className="italic font-light text-emerald-600 dark:text-emerald-400">tools</span>
        </h1>
      </header>

      <div className="inline-flex rounded-xl border border-ink-200 dark:border-ink-800 bg-ink-50 dark:bg-ink-900/40 p-1 mb-8 shadow-soft dark:shadow-none">
        {([
          { id: 'calculator',   label: 'Mortgage Calculator', icon: Calculator },
          { id: 'affordability', label: 'Home Affordability',  icon: Home },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
              tab === t.id
                ? 'bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-50 shadow-soft'
                : 'text-ink-500 hover:text-ink-800 dark:hover:text-ink-200'
            }`}>
            <t.icon className="w-3.5 h-3.5" strokeWidth={2} />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'calculator' ? <MortgageTab /> : <AffordabilityTab />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 1 — Canadian mortgage calculator
// ─────────────────────────────────────────────────────────────────────────────

function MortgageTab() {
  const [principal, setPrincipal] = useState(400_000);
  const [annual, setAnnual] = useState(5.5);
  const [amortYears, setAmortYears] = useState(25);
  const [amortMos, setAmortMos] = useState(0);
  const [term, setTerm] = useState(5);
  const [freq, setFreq] = useState<Frequency>('monthly');
  const [propTax, setPropTax] = useState(4_800);
  const [insurance, setInsurance] = useState(1_500);
  const [hoa, setHoa] = useState(0);
  const [showPrepay, setShowPrepay] = useState(false);
  const [prepayAmt, setPrepayAmt] = useState(0);
  const [prepayFreq, setPrepayFreq] = useState('yearly');

  const amortMonths = amortYears * 12 + amortMos;
  const periodsPerYear = FREQ_PER_YEAR[freq];

  const payment = useMemo(() => calcBasePayment(principal, annual, freq, amortMonths),
    [principal, annual, freq, amortMonths]);

  const schedule = useMemo(() => {
    if (principal <= 0 || payment <= 0) return [];
    const r = ratePerPeriod(annual, freq);
    let bal = principal;
    const rows: { period: number; interest: number; principal: number; balance: number }[] = [];
    while (bal > 0.01 && rows.length < periodsPerYear * 35) {
      const interest = bal * r;
      const princ = Math.min(bal, Math.max(0, payment - interest));
      bal = Math.max(0, bal - princ);
      rows.push({ period: rows.length + 1, interest, principal: princ, balance: bal });
    }
    return rows;
  }, [principal, annual, freq, payment, periodsPerYear]);

  const yearSummary = useMemo(() => {
    const map = new Map<number, { interest: number; principal: number; balance: number }>();
    for (const p of schedule) {
      const yr = Math.ceil(p.period / periodsPerYear);
      const e = map.get(yr) ?? { interest: 0, principal: 0, balance: 0 };
      map.set(yr, { interest: e.interest + p.interest, principal: e.principal + p.principal, balance: p.balance });
    }
    return Array.from(map.entries()).map(([year, v]) => ({ year, ...v }));
  }, [schedule, periodsPerYear]);

  const totalInterest = schedule.reduce((s, p) => s + p.interest, 0);
  const totalPaid = schedule.reduce((s, p) => s + p.interest + p.principal, 0);
  const actualYears = Math.ceil(schedule.length / periodsPerYear);

  // Monthly payment equivalent (for display alongside optional costs)
  const monthlyEquiv = freq === 'monthly' ? payment
    : freq === 'semi-monthly' ? payment * 2
    : (freq === 'bi-weekly' || freq === 'accel-bi-weekly') ? payment * 26 / 12
    : payment * 52 / 12;
  const totalMonthly = monthlyEquiv + propTax / 12 + insurance / 12 + hoa;

  // "How payments are applied" breakpoints
  const r = ratePerPeriod(annual, freq);
  const p1Interest = principal * r;
  const p1InterestPct = payment > 0 ? (p1Interest / payment) * 100 : 0;
  const mid = schedule[Math.floor(schedule.length / 2)];
  const last = schedule[schedule.length - 1];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

      {/* ── Inputs ── */}
      <Card className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start">
        <SectionHeader eyebrow="Payment Plan" title="Loan details"
          icon={<Calculator className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />}
        />
        <div className="space-y-5">

          <Field label="Mortgage Amount">
            <CurrencyInput value={principal} onChange={setPrincipal} />
          </Field>

          <Field label="Annual Interest Rate">
            <PercentInput value={annual} onChange={setAnnual} />
          </Field>

          <Field label="Amortization Period" hint="Max 25 yr (insured)">
            <div className="flex gap-2">
              <SelectField value={amortYears} onChange={v => setAmortYears(Number(v))}>
                {Array.from({ length: 30 }, (_, i) => i + 1).map(y =>
                  <option key={y} value={y}>{y} year{y !== 1 ? 's' : ''}</option>)}
              </SelectField>
              <div className="w-32 flex-shrink-0">
                <SelectField value={amortMos} onChange={v => setAmortMos(Number(v))}>
                  {Array.from({ length: 12 }, (_, i) => i).map(m =>
                    <option key={m} value={m}>{m} month{m !== 1 ? 's' : ''}</option>)}
                </SelectField>
              </div>
            </div>
          </Field>

          <Field label="Payment Frequency">
            <SelectField value={freq} onChange={v => setFreq(v as Frequency)}>
              {(Object.entries(FREQ_LABELS) as [Frequency, string][]).map(([f, label]) =>
                <option key={f} value={f}>{label}</option>)}
            </SelectField>
          </Field>

          <Field label="Mortgage Term">
            <SelectField value={term} onChange={v => setTerm(Number(v))}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(y =>
                <option key={y} value={y}>{y} year{y !== 1 ? 's' : ''}</option>)}
            </SelectField>
            <p className="text-[11px] text-ink-500 mt-1.5 leading-relaxed">
              Rate is locked for {term} yr. Balance carries forward at renewal.
            </p>
          </Field>

          <div className="pt-4 border-t border-ink-200/70 dark:border-ink-800">
            <Eyebrow className="mb-4">Optional Costs</Eyebrow>
            <div className="space-y-4">
              <Field label="Property Tax (annual)"><CurrencyInput value={propTax} onChange={setPropTax} /></Field>
              <Field label="Home Insurance (annual)"><CurrencyInput value={insurance} onChange={setInsurance} /></Field>
              <Field label="Condo / HOA (monthly)"><CurrencyInput value={hoa} onChange={setHoa} /></Field>
            </div>
          </div>

          <div className="pt-4 border-t border-ink-200/70 dark:border-ink-800">
            <button className="w-full flex items-center justify-between eyebrow hover:text-ink-700 dark:hover:text-ink-200 transition-colors"
              onClick={() => setShowPrepay(!showPrepay)}>
              Prepayment Plan
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPrepay ? 'rotate-180' : ''}`} />
            </button>
            {!showPrepay && <p className="text-[11px] text-ink-500 mt-1.5">Extra payments reduce principal and save interest.</p>}
            {showPrepay && (
              <div className="mt-4 space-y-4">
                <Field label="Prepayment Amount"><CurrencyInput value={prepayAmt} onChange={setPrepayAmt} /></Field>
                <Field label="Frequency">
                  <SelectField value={prepayFreq} onChange={setPrepayFreq}>
                    <option value="yearly">Yearly lump sum</option>
                    <option value="once">One-time</option>
                    <option value="per-payment">Each payment</option>
                  </SelectField>
                </Field>
                <p className="text-[11px] text-ink-500 leading-relaxed">Most lenders allow 10–20% annual prepayment without penalty.</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Results ── */}
      <div className="lg:col-span-3 space-y-5">

        {/* Hero */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-500/10 dark:via-ink-900/60 dark:to-ink-900/60 border border-emerald-500/20 rounded-2xl p-6 md:p-7 shadow-card dark:shadow-none">
          <Eyebrow>Your {FREQ_LABELS[freq]} Payment</Eyebrow>
          <p className="display text-5xl md:text-6xl mt-2 leading-none text-emerald-700 dark:text-emerald-400">
            {fmtCurrency(payment)}
          </p>
          {(propTax > 0 || insurance > 0 || hoa > 0) && (
            <p className="text-sm text-ink-500 mt-2">
              Including taxes &amp; insurance: <strong className="text-ink-800 dark:text-ink-100">{fmtCurrency(totalMonthly)}/mo</strong>
            </p>
          )}
          <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-emerald-500/20">
            <ResultItem label="Total Interest" value={fmtCurrency(totalInterest)} accent="rose" />
            <ResultItem label="Total Cost" value={fmtCurrency(totalPaid)} />
            <ResultItem label="Payments" value={`${schedule.length.toLocaleString()} (${actualYears} yrs)`} />
            <ResultItem label="Interest per $1 borrowed" value={principal > 0 ? `${fmtCurrency(totalInterest / principal)}` : '—'} />
          </div>
        </div>

        {/* How payments are applied */}
        <Card>
          <SectionHeader eyebrow="Payment Breakdown" title="How payments are applied"
            icon={<Info className="w-5 h-5 text-sky-500" strokeWidth={1.75} />}
          />
          <p className="text-sm text-ink-600 dark:text-ink-400 mb-5 leading-relaxed">
            Every payment covers <span className="text-rose-600 dark:text-rose-400 font-medium">interest first</span>, then the remainder
            reduces <span className="text-emerald-600 dark:text-emerald-400 font-medium">principal</span>. Early in the mortgage, the
            vast majority goes to interest. As the balance falls, the split gradually shifts — accelerating toward the end.
          </p>

          <div className="space-y-5">
            {([
              { label: 'Payment 1', iAmt: p1Interest, pAmt: payment - p1Interest, iPct: p1InterestPct },
              mid ? { label: `Year ${Math.ceil(mid.period / periodsPerYear)}`, iAmt: mid.interest, pAmt: mid.principal, iPct: (mid.interest / (mid.interest + mid.principal)) * 100 } : null,
              last ? { label: `Year ${actualYears} (final)`, iAmt: last.interest, pAmt: last.principal, iPct: (last.interest / (last.interest + last.principal)) * 100 } : null,
            ].filter(Boolean)).map((row, i) => row && (
              <div key={i}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-ink-700 dark:text-ink-300">{row.label}</span>
                  <span className="text-[11px] font-numeric tabular text-ink-500">
                    <span className="text-rose-500">{fmtCurrency(row.iAmt)}</span>
                    {' '}·{' '}
                    <span className="text-emerald-600">{fmtCurrency(row.pAmt)}</span>
                  </span>
                </div>
                <div className="h-4 rounded-lg overflow-hidden flex bg-ink-100 dark:bg-ink-800">
                  <div className="bg-rose-400/80 dark:bg-rose-500 h-full transition-all duration-500 flex items-center justify-end pr-1.5"
                    style={{ width: `${row.iPct}%` }}>
                    {row.iPct > 18 && <span className="text-[9px] text-white font-semibold">{row.iPct.toFixed(0)}%</span>}
                  </div>
                  <div className="bg-emerald-500/80 dark:bg-emerald-500 h-full flex-1 flex items-center pl-1.5">
                    {(100 - row.iPct) > 18 && <span className="text-[9px] text-white font-semibold">{(100 - row.iPct).toFixed(0)}%</span>}
                  </div>
                </div>
                <div className="flex gap-4 mt-1 text-[10px] text-ink-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-rose-400/80 dark:bg-rose-500 inline-block" />Interest</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/80 dark:bg-emerald-500 inline-block" />Principal</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-ink-200/70 dark:border-ink-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FactBox icon="🇨🇦" title="Canadian compounding">
              Interest compounds semi-annually (not monthly) as required by the Interest Act. Effective monthly rate = (1 + rate÷2)^(1/6) − 1.
            </FactBox>
            <FactBox icon="⚡" title="Accelerated payments">
              Accelerated bi-weekly = half a monthly payment, paid 26 times a year. The equivalent of one extra monthly payment per year — cuts years off your amortization.
            </FactBox>
            <FactBox icon="🔒" title="Term vs amortization">
              <strong>Term</strong> ({term} yr) locks your rate. <strong>Amortization</strong> ({amortYears} yr{amortMos > 0 ? ` ${amortMos} mo` : ''}) is the full repayment timeline. At renewal the outstanding balance carries forward, possibly at a new rate.
            </FactBox>
            <FactBox icon="💰" title="Prepayments">
              Most lenders allow 10–20% annual lump-sum prepayments without penalty. An extra payment early in the mortgage saves a disproportionate amount of lifetime interest because it reduces the principal before years of compounding.
            </FactBox>
          </div>
        </Card>

        {/* Amortization table */}
        {yearSummary.length > 0 && (
          <Card padded={false}>
            <div className="p-5 md:p-6 pb-3">
              <SectionHeader eyebrow="Amortization Schedule" title="Year-by-year"
                icon={<TrendingUp className="w-5 h-5 text-ink-400" strokeWidth={1.75} />}
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-ink-200/70 dark:border-ink-800 bg-ink-50/60 dark:bg-ink-900/40">
                    <th className="px-5 py-3 text-left eyebrow !text-[10px]">Year</th>
                    <th className="px-4 py-3 text-right eyebrow !text-[10px]">Principal</th>
                    <th className="px-4 py-3 text-right eyebrow !text-[10px]">Interest</th>
                    <th className="px-4 py-3 text-right eyebrow !text-[10px]">Balance</th>
                    <th className="px-5 py-3 text-right eyebrow !text-[10px]">Paid Off</th>
                  </tr>
                </thead>
                <tbody>
                  {yearSummary.map((row) => {
                    const pctOff = Math.min(100, ((principal - row.balance) / principal) * 100);
                    const isTermEnd = row.year === term;
                    return (
                      <tr key={row.year} className={`border-b border-ink-200/40 dark:border-ink-800/60 hover:bg-ink-50/40 dark:hover:bg-ink-800/20 transition-colors ${isTermEnd ? 'bg-sky-50/50 dark:bg-sky-500/5' : ''}`}>
                        <td className="px-5 py-2.5 font-medium text-ink-700 dark:text-ink-300 text-sm">
                          {row.year}
                          {isTermEnd && <span className="ml-2 text-[9.5px] text-sky-600 dark:text-sky-400 font-bold uppercase tracking-wider">Term end</span>}
                        </td>
                        <td className="px-4 py-2.5 text-right font-numeric tabular text-xs text-emerald-700 dark:text-emerald-400">{fmtCurrency(row.principal)}</td>
                        <td className="px-4 py-2.5 text-right font-numeric tabular text-xs text-rose-600 dark:text-rose-400">{fmtCurrency(row.interest)}</td>
                        <td className="px-4 py-2.5 text-right font-numeric tabular text-xs text-ink-700 dark:text-ink-300">{fmtCurrency(row.balance)}</td>
                        <td className="px-5 py-2.5">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-14 h-1.5 rounded-full bg-ink-200 dark:bg-ink-800 overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${pctOff}%` }} />
                            </div>
                            <span className="text-[11px] font-numeric tabular text-ink-500 w-9 text-right">{pctOff.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="px-5 md:px-6 py-3.5 text-[11px] text-ink-500 border-t border-ink-200/70 dark:border-ink-800">
              Blue row = term end · Assumes rate constant over full amortization — actual cost depends on renewal rates
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab 2 — Home affordability (1st, 2nd, investment)
// ─────────────────────────────────────────────────────────────────────────────

function AffordabilityTab() {
  const [homeType, setHomeType] = useState<HomeType>('first');
  const [grossIncome, setGrossIncome] = useState(120_000);
  const [otherDebt, setOtherDebt] = useState(500);
  const [downPayment, setDownPayment] = useState(80_000);
  const [annual, setAnnual] = useState(5.5);
  const [propTax, setPropTax] = useState(4_800);
  const [heating, setHeating] = useState(150);
  const [condoFee, setCondoFee] = useState(0);
  const [amortYears, setAmortYears] = useState(25);

  const monthlyIncome = grossIncome / 12;
  const stressRate = Math.max(annual + 2, 5.25);

  // GDS ≤ 39%, TDS ≤ 44% (CMHC rules)
  const monthlyTax = propTax / 12;
  const maxPI_gds = 0.39 * monthlyIncome - monthlyTax - heating - condoFee * 0.5;
  const maxPI_tds = 0.44 * monthlyIncome - otherDebt - monthlyTax - heating - condoFee * 0.5;
  const maxPI = Math.max(0, Math.min(maxPI_gds, maxPI_tds));

  const r_stress = effectiveMonthlyRate(stressRate);
  const n = amortYears * 12;
  const maxMortgage = maxPI > 0 ? maxPI * (r_stress > 0 ? (1 - Math.pow(1 + r_stress, -n)) / r_stress : n) : 0;
  const maxPrice = Math.max(downPayment, maxMortgage + downPayment);

  const actualMortgage = Math.max(0, maxPrice - downPayment);
  const cmhc = homeType === 'first' ? cmhcRate(maxPrice, downPayment) : 0;
  const cmhcAmt = actualMortgage * cmhc;
  const insuredMortgage = actualMortgage + cmhcAmt;

  const r_actual = effectiveMonthlyRate(annual);
  const monthlyPI = calcPayment(insuredMortgage, r_actual, n);
  const monthlyHousing = monthlyPI + monthlyTax + heating + condoFee * 0.5;

  const gds = monthlyIncome > 0 ? monthlyHousing / monthlyIncome : 0;
  const tds = monthlyIncome > 0 ? (monthlyHousing + otherDebt) / monthlyIncome : 0;

  const minDp = minDownPayment(maxPrice);
  const dpSufficient = downPayment >= minDp;

  const homeInfo: Record<HomeType, { label: string; desc: string; minDp: string }> = {
    first:      { label: '1st Home',             desc: 'Primary residence — minimum 5% down (up to $500K), CMHC insurable up to $999,999, stress test applies.', minDp: '5% / 10% / 20%' },
    second:     { label: '2nd Home',              desc: 'Vacation or secondary property — minimum 20% down required, no CMHC insurance, stress test applies.', minDp: '20%' },
    investment: { label: 'Investment Property',   desc: 'Rental / income property — minimum 20% down, lender-specific qualification rules, rates typically higher.', minDp: '20%' },
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

      {/* Inputs */}
      <Card className="lg:col-span-2 lg:sticky lg:top-6 lg:self-start">
        <SectionHeader eyebrow="Affordability" title="Your situation"
          icon={<Home className="w-5 h-5 text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} />}
        />

        <div className="mb-5">
          <Eyebrow className="mb-2.5">Property Type</Eyebrow>
          <div className="flex flex-col gap-1.5">
            {(['first', 'second', 'investment'] as HomeType[]).map(type => (
              <button key={type} onClick={() => setHomeType(type)}
                className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${
                  homeType === type
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm font-medium'
                    : 'bg-white dark:bg-ink-900/40 border-ink-200 dark:border-ink-800 text-ink-700 dark:text-ink-300 hover:border-ink-300 dark:hover:border-ink-700'
                }`}>
                {homeInfo[type].label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-ink-500 mt-2 leading-relaxed">{homeInfo[homeType].desc}</p>
        </div>

        <div className="space-y-4 pt-4 border-t border-ink-200/70 dark:border-ink-800">
          <Field label="Gross Annual Income"><CurrencyInput value={grossIncome} onChange={setGrossIncome} /></Field>
          <Field label="Other Monthly Debts" hint="car, student loan…"><CurrencyInput value={otherDebt} onChange={setOtherDebt} /></Field>
          <Field label="Available Down Payment"><CurrencyInput value={downPayment} onChange={setDownPayment} /></Field>
          <Field label="Interest Rate"><PercentInput value={annual} onChange={setAnnual} /></Field>
          <Field label="Amortization">
            <SelectField value={amortYears} onChange={v => setAmortYears(Number(v))}>
              {Array.from({ length: 30 }, (_, i) => i + 1).map(y =>
                <option key={y} value={y}>{y} years</option>)}
            </SelectField>
          </Field>
          <Field label="Property Tax (annual)"><CurrencyInput value={propTax} onChange={setPropTax} /></Field>
          <Field label="Monthly Heating" hint="used in GDS"><CurrencyInput value={heating} onChange={setHeating} /></Field>
          <Field label="Condo Fee (monthly)" hint="50% counted in GDS"><CurrencyInput value={condoFee} onChange={setCondoFee} /></Field>
        </div>
      </Card>

      {/* Results */}
      <div className="lg:col-span-3 space-y-5">

        {/* Hero */}
        <div className="bg-gradient-to-br from-emerald-50 via-white to-white dark:from-emerald-500/10 dark:via-ink-900/60 dark:to-ink-900/60 border border-emerald-500/20 rounded-2xl p-6 md:p-7 shadow-card dark:shadow-none">
          <Eyebrow>Maximum Affordable Purchase Price</Eyebrow>
          <p className="display text-5xl md:text-6xl mt-2 leading-none text-emerald-700 dark:text-emerald-400">
            {fmtCurrency(maxPrice)}
          </p>
          <p className="text-sm text-ink-500 mt-2">
            Qualifying at stress-test rate of <strong className="text-ink-800 dark:text-ink-100">{stressRate.toFixed(2)}%</strong> (contract + 2%, min 5.25%)
          </p>

          {!dpSufficient && (
            <div className="mt-4 p-3 bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/30 rounded-xl text-sm text-rose-700 dark:text-rose-300">
              Your down payment is {fmtCurrency(downPayment - minDp)} short of the minimum required ({fmtCurrency(minDp)}) for this price.
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mt-5 pt-5 border-t border-emerald-500/20">
            <ResultItem label="Max Mortgage" value={fmtCurrency(actualMortgage)} />
            <ResultItem label="Est. Monthly Payment" value={fmtCurrency(monthlyPI)} />
            {cmhcAmt > 0 && <ResultItem label="CMHC Insurance" value={fmtCurrency(cmhcAmt)} accent="rose" />}
            {cmhcAmt > 0 && <ResultItem label="CMHC Premium Rate" value={`${(cmhc * 100).toFixed(2)}%`} />}
          </div>
        </div>

        {/* GDS / TDS */}
        <Card>
          <SectionHeader eyebrow="Qualifying Ratios" title="GDS and TDS"
            icon={<Activity className="w-5 h-5 text-sky-500" strokeWidth={1.75} />}
          />
          <p className="text-sm text-ink-600 dark:text-ink-400 mb-5 leading-relaxed">
            Lenders use two ratios to determine how much you can borrow. Both must be within limits for approval —
            your mortgage payment, taxes, heating, and debts all factor in.
          </p>
          <div className="space-y-6">
            {[
              { label: 'Gross Debt Service (GDS)', value: gds, max: 0.39, desc: 'Housing costs ÷ gross income. Includes P&I, property tax, heating, 50% of condo fee. Max 39% under CMHC.' },
              { label: 'Total Debt Service (TDS)', value: tds, max: 0.44, desc: 'All debt payments ÷ gross income. GDS plus car loans, credit cards, student loans, and other obligations. Max 44%.' },
            ].map((ratio) => {
              const over = ratio.value > ratio.max;
              const barPct = Math.min(ratio.value * 100, 55);
              const maxLinePct = ratio.max * 100;
              return (
                <div key={ratio.label}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-ink-700 dark:text-ink-300">{ratio.label}</span>
                    <span className={`text-sm font-numeric tabular font-semibold ${over ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                      {(ratio.value * 100).toFixed(1)}%
                      <span className="text-ink-400 font-normal text-xs ml-1">/ {(ratio.max * 100).toFixed(0)}% max</span>
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-ink-100 dark:bg-ink-800 relative overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${over ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${(barPct / 55) * 100}%` }} />
                    <div className="absolute top-0 bottom-0 w-0.5 bg-ink-400/50" style={{ left: `${(maxLinePct / 55) * 100}%` }} />
                  </div>
                  <p className="text-[11px] text-ink-500 mt-1.5 leading-relaxed">{ratio.desc}</p>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Down payment rules */}
        <Card>
          <SectionHeader eyebrow="Down Payment" title="Canadian minimum requirements"
            icon={<Shield className="w-5 h-5 text-amber-500" strokeWidth={1.75} />}
          />

          {homeType !== 'first' ? (
            <div className="text-sm text-ink-600 dark:text-ink-400 space-y-3">
              <p>A minimum <strong className="text-ink-800 dark:text-ink-200">20% down payment</strong> is required for {homeInfo[homeType].label.toLowerCase()} purchases. CMHC mortgage insurance is not available.</p>
              <div className={`p-3.5 rounded-xl border text-sm ${
                dpSufficient
                  ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-300'
              }`}>
                {dpSufficient
                  ? `✓ Your down payment of ${fmtCurrency(downPayment)} meets the 20% minimum on this purchase.`
                  : `✗ You need ${fmtCurrency(minDp - downPayment)} more to meet the 20% minimum of ${fmtCurrency(minDp)}.`}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[
                { range: 'Up to $500,000',         rule: '5% minimum',                         cmhc: true },
                { range: '$500,001 – $999,999',    rule: '5% on first $500K + 10% on remainder', cmhc: true },
                { range: '$1,000,000 and above',   rule: '20% minimum',                          cmhc: false },
              ].map((tier, i) => (
                <div key={i} className="flex items-center gap-4 p-3.5 rounded-xl border border-ink-200/70 dark:border-ink-800 bg-ink-50/30 dark:bg-ink-900/30">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-ink-800 dark:text-ink-200">{tier.range}</p>
                    <p className="text-xs text-ink-500 mt-0.5">{tier.rule}</p>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    tier.cmhc
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
                      : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-500/30'
                  }`}>{tier.cmhc ? 'CMHC insurable' : 'CMHC not available'}</span>
                </div>
              ))}

              {cmhcAmt > 0 && (
                <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">CMHC insurance applies</p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    With {((downPayment / maxPrice) * 100).toFixed(1)}% down on {fmtCurrency(maxPrice)}, the CMHC
                    premium is <strong>{(cmhc * 100).toFixed(2)}%</strong> ({fmtCurrency(cmhcAmt)}) — added to your mortgage and amortized over the full term.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-5 pt-5 border-t border-ink-200/70 dark:border-ink-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FactBox icon="📊" title="Stress test (all buyers)">
              Every mortgage must qualify at the higher of your contract rate + 2%, or 5.25%, regardless of down payment size. This ensures you can absorb rate increases at renewal.
            </FactBox>
            {homeType === 'first' && (
              <FactBox icon="🏦" title="FHSA & RRSP HBP">
                First-time buyers can withdraw up to $40,000 from a First Home Savings Account (FHSA) tax-free, and up to $35,000 from an RRSP via the Home Buyers' Plan (HBP).
              </FactBox>
            )}
            {homeType === 'first' && (
              <FactBox icon="🎁" title="Land transfer rebate">
                Ontario and BC offer first-time buyer rebates on land transfer tax — up to $4,000 and $8,000 respectively. Most other provinces have similar programs.
              </FactBox>
            )}
            {homeType === 'first' && (
              <FactBox icon="📋" title="First-time buyer credit">
                The federal First-Time Home Buyers' Tax Credit provides a $1,500 non-refundable tax credit in the year of purchase.
              </FactBox>
            )}
            {homeType === 'investment' && (
              <FactBox icon="💼" title="Rental income qualifying">
                Up to 80% of gross rental income may be added to your qualifying income. Rules vary by lender — confirm with a mortgage broker.
              </FactBox>
            )}
            {homeType === 'second' && (
              <FactBox icon="✈️" title="Vacation property rules">
                Second homes used personally have different qualification criteria than investment properties. Rental income from part-time use may or may not count depending on the lender.
              </FactBox>
            )}
            <FactBox icon="🔁" title="Renewal strategy">
              {homeType === 'first'
                ? 'At each renewal, you can renegotiate your rate, switch lenders, or increase prepayments. Compare at least 3 lenders before renewing — the posted rate is rarely the best available.'
                : 'Investment and second properties may have more limited refinancing options. Keep renewal dates in a calendar and start shopping 120 days early.'}
            </FactBox>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared sub-components
// ─────────────────────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="eyebrow">{label}</label>
        {hint && <span className="text-[10.5px] text-ink-500 italic">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SelectField({ value, onChange, children }: {
  value: string | number;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full appearance-none bg-white dark:bg-ink-900/40 border border-ink-200 dark:border-ink-800 text-ink-900 dark:text-ink-100 rounded-xl px-4 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/60 transition-all cursor-pointer">
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-400 pointer-events-none" />
    </div>
  );
}

function ResultItem({ label, value, accent }: { label: string; value: string; accent?: 'rose' }) {
  return (
    <div>
      <Eyebrow className="mb-1">{label}</Eyebrow>
      <p className={`font-numeric tabular text-lg font-medium ${accent === 'rose' ? 'text-rose-700 dark:text-rose-400' : 'text-ink-800 dark:text-ink-100'}`}>
        {value}
      </p>
    </div>
  );
}

function FactBox({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-ink-50/60 dark:bg-ink-800/30 border border-ink-200/70 dark:border-ink-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-sm">{icon}</span>
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-ink-700 dark:text-ink-200">{title}</p>
      </div>
      <p className="text-[11.5px] text-ink-600 dark:text-ink-400 leading-relaxed">{children}</p>
    </div>
  );
}

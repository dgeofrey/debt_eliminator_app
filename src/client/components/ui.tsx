import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, forwardRef } from 'react';

export function Card({ children, className = '', padded = true }: {
  children: ReactNode; className?: string; padded?: boolean;
}) {
  return (
    <div className={`bg-white dark:bg-ink-900 border border-ink-100 dark:border-white/[0.07] rounded-xl ${padded ? 'p-6 md:p-7' : ''} ${className}`}>
      {children}
    </div>
  );
}

export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`eyebrow ${className}`}>{children}</p>;
}

type SectionHeaderProps = { eyebrow?: string; title?: string; icon?: ReactNode; right?: ReactNode };
export function SectionHeader({ eyebrow, title, icon, right }: SectionHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-3 mb-5">
      <div>
        {eyebrow && <Eyebrow className="mb-1.5">{eyebrow}</Eyebrow>}
        {title && (
          <h2 className="text-lg font-bold tracking-tight text-ink-900 dark:text-white flex items-center gap-2">
            {icon}{title}
          </h2>
        )}
      </div>
      {right}
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant; size?: 'sm' | 'md'; fullWidth?: boolean;
};
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, className = '', children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed tracking-wide';
    const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm' };
    const variants = {
      primary:   'bg-ink-900 hover:bg-ink-800 dark:bg-white dark:hover:bg-ink-100 text-white dark:text-ink-900 active:scale-[0.98]',
      secondary: 'border border-ink-200 dark:border-white/15 text-ink-700 dark:text-ink-200 hover:bg-ink-50 dark:hover:bg-white/5 bg-transparent',
      ghost:     'text-ink-500 hover:text-ink-900 dark:hover:text-white hover:bg-ink-50 dark:hover:bg-white/5',
      danger:    'text-ink-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10',
    };
    return (
      <button ref={ref} className={`${base} ${sizes[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  leftIcon?: ReactNode; rightAdornment?: ReactNode; accent?: 'emerald' | 'amber' | 'rose' | 'sky';
};
export const TextInput = forwardRef<HTMLInputElement, TextInputProps>(
  ({ leftIcon, rightAdornment, accent = 'emerald', className = '', ...props }, ref) => {
    const accents = {
      emerald: 'focus:border-emerald-500/50 focus:ring-emerald-500/10',
      amber:   'focus:border-amber-500/50 focus:ring-amber-500/10',
      rose:    'focus:border-rose-500/50 focus:ring-rose-500/10',
      sky:     'focus:border-sky-500/50 focus:ring-sky-500/10',
    };
    return (
      <div className="relative">
        {leftIcon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none">{leftIcon}</div>}
        <input ref={ref}
          className={`w-full bg-ink-50 dark:bg-white/[0.04] border border-ink-200 dark:border-white/10 rounded-lg ${leftIcon ? 'pl-10' : 'pl-4'} ${rightAdornment ? 'pr-9' : 'pr-4'} py-2.5 text-sm text-ink-900 dark:text-white placeholder-ink-400 dark:placeholder-white/30 focus:outline-none focus:ring-4 transition-all ${accents[accent]} ${className}`}
          {...props}
        />
        {rightAdornment && <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-500 text-xs">{rightAdornment}</div>}
      </div>
    );
  }
);
TextInput.displayName = 'TextInput';

type NumInputProps = { value: number; onChange: (n: number) => void; accent?: 'emerald' | 'amber' | 'rose' | 'sky'; step?: string; className?: string };

export function CurrencyInput({ value, onChange, accent = 'emerald', step, className = '' }: NumInputProps) {
  return (
    <TextInput type="number" step={step} value={value === 0 ? '' : value}
      onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      placeholder="0" accent={accent} leftIcon={<span className="text-sm font-medium">$</span>}
      className={`font-numeric tabular ${className}`} />
  );
}

export function PercentInput({ value, onChange, accent = 'emerald' }: NumInputProps) {
  return (
    <TextInput type="number" step="0.01" value={value === 0 ? '' : value}
      onChange={e => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      placeholder="0" accent={accent} rightAdornment={<span className="font-medium">%</span>}
      className="font-numeric tabular" />
  );
}

export function Divider({ className = '' }: { className?: string }) {
  return <div className={`h-px bg-ink-100 dark:bg-white/[0.06] ${className}`} />;
}

type PillProps = { children: ReactNode; tone?: 'emerald' | 'sky' | 'amber' | 'rose' | 'neutral'; icon?: ReactNode };
export function Pill({ children, tone = 'neutral', icon }: PillProps) {
  const tones = {
    emerald: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20',
    sky:     'bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20',
    amber:   'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20',
    rose:    'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
    neutral: 'bg-ink-100 dark:bg-white/5 text-ink-600 dark:text-ink-300 border-ink-200 dark:border-white/10',
  };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${tones[tone]}`}>
      {icon}{children}
    </span>
  );
}

import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

import { cn } from '../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant = 'primary', children, ...props }, ref) {
  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-sentix-accent text-black hover:bg-white',
    secondary: 'bg-sentix-surfaceAlt text-sentix-text hover:bg-white/10 border border-sentix-border',
    ghost: 'text-sentix-text hover:bg-white/5',
    danger: 'bg-red-500/90 text-white hover:bg-red-400'
  };

  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold uppercase tracking-[0.18em] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sentix-accent/80 disabled:cursor-not-allowed disabled:opacity-60',
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
});

Button.displayName = 'Button';

interface PanelProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function Panel({ title, subtitle, action, className, children }: PanelProps) {
  return (
    <section className={cn('rounded-3xl border border-sentix-border bg-sentix-surface/90 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl', className)}>
      {(title || subtitle || action) && (
        <header className="mb-4 flex items-start justify-between gap-4">
          <div>
            {title ? <h2 className="text-sm font-bold uppercase tracking-[0.3em] text-sentix-text">{title}</h2> : null}
            {subtitle ? <p className="mt-2 max-w-2xl text-sm leading-6 text-sentix-muted">{subtitle}</p> : null}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

interface FieldLabelProps {
  label: string;
  hint?: string;
}

export function FieldLabel({ label, hint }: FieldLabelProps) {
  return (
    <div className="mb-2 flex items-center justify-between gap-4">
      <label className="text-[11px] font-bold uppercase tracking-[0.35em] text-sentix-text">{label}</label>
      {hint ? <span className="text-[10px] uppercase tracking-[0.25em] text-sentix-muted">{hint}</span> : null}
    </div>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'w-full rounded-2xl border border-sentix-border bg-black/40 px-4 py-3 text-sm text-sentix-text placeholder:text-sentix-muted focus:border-sentix-accent focus:outline-none focus:ring-1 focus:ring-sentix-accent',
        className,
      )}
      {...props}
    />
  );
}

export function TextArea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        'min-h-[180px] w-full rounded-3xl border border-sentix-border bg-black/40 px-4 py-4 text-sm leading-7 text-sentix-text placeholder:text-sentix-muted focus:border-sentix-accent focus:outline-none focus:ring-1 focus:ring-sentix-accent',
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'w-full rounded-2xl border border-sentix-border bg-black/40 px-4 py-3 text-sm text-sentix-text focus:border-sentix-accent focus:outline-none focus:ring-1 focus:ring-sentix-accent',
        className,
      )}
      {...props}
    />
  );
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border border-sentix-border bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sentix-text', className)}>
      {children}
    </span>
  );
}

export function MetricCard({ label, value, caption, tone = 'default' }: { label: string; value: string | number; caption?: string; tone?: 'default' | 'success' | 'warning' | 'danger' }) {
  const toneClasses: Record<typeof tone, string> = {
    default: 'text-sentix-text',
    success: 'text-emerald-300',
    warning: 'text-amber-300',
    danger: 'text-red-300'
  };

  return (
    <div className="rounded-3xl border border-sentix-border bg-black/30 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-sentix-muted">{label}</p>
      <p className={cn('mt-3 text-2xl font-black tracking-tight', toneClasses[tone])}>{value}</p>
      {caption ? <p className="mt-2 text-xs leading-5 text-sentix-muted">{caption}</p> : null}
    </div>
  );
}

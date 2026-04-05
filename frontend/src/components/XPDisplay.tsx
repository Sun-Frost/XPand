import React, { useEffect, useRef, useState } from 'react';

// ── XP Display ───────────────────────────────────────────────
type XPSize = 'sm' | 'md' | 'lg' | 'xl';

interface XPDisplayProps {
  amount: number;
  size?: XPSize;
  showIcon?: boolean;
  animated?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<XPSize, string> = {
  sm: 'xp-amount-sm',
  md: 'xp-amount',
  lg: 'xp-amount-lg',
  xl: 'xp-amount-xl',
};

const XPDisplay: React.FC<XPDisplayProps> = ({
  amount,
  size = 'md',
  showIcon = true,
  animated = false,
  className = '',
}) => {
  const [displayValue, setDisplayValue] = useState(animated ? 0 : amount);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!animated) { setDisplayValue(amount); return; }
    const start = displayValue;
    const end = amount;
    const duration = 1000;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(Math.round(start + (end - start) * eased));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [amount]); // eslint-disable-line

  return (
    <span className={`xp-display ${className}`}>
      {showIcon && (
        <span className="xp-icon">XP</span>
      )}
      <span className={SIZE_CLASSES[size]}>
        {displayValue.toLocaleString()}
      </span>
    </span>
  );
};

// ── XP Pill (compact inline) ─────────────────────────────────
interface XPPillProps {
  amount: number;
  prefix?: string;
  className?: string;
}
export const XPPill: React.FC<XPPillProps> = ({ amount, prefix = '', className = '' }) => (
  <span className={`xp-pill ${className}`}>
    <span style={{ fontSize: '0.65rem', fontWeight: 'var(--weight-bold)' as any, opacity: 0.7 }}>XP</span>
    {prefix && <span style={{ opacity: 0.6 }}>{prefix}</span>}
    <span style={{ fontWeight: 'var(--weight-semibold)' as any }}>{amount.toLocaleString()}</span>
  </span>
);

// ── XP Transaction Row ───────────────────────────────────────
type XPTransactionType = 'earn' | 'spend';
interface XPTransactionProps {
  description: string;
  amount: number;
  type: XPTransactionType;
  date?: string;
}
export const XPTransaction: React.FC<XPTransactionProps> = ({
  description, amount, type, date,
}) => (
  <div className="flex items-center justify-between" style={{
    padding: 'var(--space-3) var(--space-4)',
    borderBottom: '1px solid var(--color-border-subtle)',
  }}>
    <div className="flex items-center gap-3">
      <div style={{
        width: 32, height: 32,
        borderRadius: 'var(--radius-md)',
        background: type === 'earn' ? 'var(--color-success-bg)' : 'var(--color-danger-bg)',
        border: `1px solid ${type === 'earn' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '0.85rem',
        flexShrink: 0,
      }}>
        {type === 'earn' ? '↑' : '↓'}
      </div>
      <div>
        <div style={{
          fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-medium)',
          color: 'var(--color-text-primary)',
        }}>
          {description}
        </div>
        {date && (
          <div style={{
            fontSize: 'var(--text-xs)',
            color: 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)',
            marginTop: 2,
          }}>
            {date}
          </div>
        )}
      </div>
    </div>
    <span style={{
      fontFamily: 'var(--font-display)',
      fontWeight: 'var(--weight-bold)',
      fontSize: 'var(--text-base)',
      color: type === 'earn' ? 'var(--color-success)' : 'var(--color-danger)',
    }}>
      {type === 'earn' ? '+' : '−'}{amount} XP
    </span>
  </div>
);

// ── XP Gain Floating Notification ───────────────────────────
interface XPGainFloatProps {
  amount: number;
  x: number;
  y: number;
  onDone: () => void;
}
export const XPGainFloat: React.FC<XPGainFloatProps> = ({ amount, x, y, onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 1500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div
      className="xp-gain"
      style={{ left: x, top: y }}
    >
      +{amount} XP
    </div>
  );
};

export default XPDisplay;

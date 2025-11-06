import React, { type ReactNode } from 'react';

export type BadgeVariant = 'success' | 'danger' | 'warn' | 'info' | 'secondary';
export type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

const variantStyles: Record<BadgeVariant, React.CSSProperties> = {
  success: {
    background: '#ecfdf5',
    color: '#047857',
  },
  danger: {
    background: '#fef2f2',
    color: '#b91c1c',
  },
  warn: {
    background: '#fffbeb',
    color: '#b45309',
  },
  info: {
    background: '#eff6ff',
    color: '#1d4ed8',
  },
  secondary: {
    background: '#f1f5f9',
    color: '#475569',
  },
};

const sizeStyles: Record<BadgeSize, React.CSSProperties> = {
  sm: {
    padding: '2px 8px',
    fontSize: '0.7rem',
  },
  md: {
    padding: '4px 10px',
    fontSize: '0.78rem',
  },
  lg: {
    padding: '6px 12px',
    fontSize: '0.875rem',
  },
};

const baseStyles: React.CSSProperties = {
  borderRadius: '6px',
  fontWeight: 500,
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  whiteSpace: 'nowrap',
};

export function Badge({
  variant = 'secondary',
  size = 'md',
  children,
  className = '',
  icon,
}: BadgeProps) {
  return (
    <span
      className={className}
      style={{
        ...baseStyles,
        ...variantStyles[variant],
        ...sizeStyles[size],
      }}
    >
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      {children}
    </span>
  );
}


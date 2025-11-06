import React, { type ReactNode, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  children?: ReactNode;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: {
    background: '#22c55e',
    color: '#062415',
    border: 'none',
  },
  secondary: {
    background: 'rgba(255,255,255,0.1)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
  },
  success: {
    background: '#22c55e',
    color: '#062415',
    border: 'none',
  },
  danger: {
    background: '#ef4444',
    color: '#fff',
    border: 'none',
  },
  outline: {
    background: 'transparent',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.3)',
  },
  ghost: {
    background: 'transparent',
    color: '#fff',
    border: 'none',
  },
};

const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
  sm: {
    padding: '6px 12px',
    fontSize: '0.875rem',
    height: '32px',
  },
  md: {
    padding: '8px 16px',
    fontSize: '0.9375rem',
    height: '40px',
  },
  lg: {
    padding: '12px 24px',
    fontSize: '1rem',
    height: '48px',
  },
};

const baseStyles: React.CSSProperties = {
  borderRadius: '8px',
  fontWeight: 600,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  outline: 'none',
  fontFamily: 'inherit',
};

const hoverStyles: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: '#16a34a', transform: 'translateY(-1px)' },
  secondary: { background: 'rgba(255,255,255,0.15)' },
  success: { background: '#16a34a', transform: 'translateY(-1px)' },
  danger: { background: '#dc2626', transform: 'translateY(-1px)' },
  outline: { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.5)' },
  ghost: { background: 'rgba(255,255,255,0.08)' },
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  iconPosition = 'left',
  children,
  fullWidth = false,
  disabled,
  className = '',
  style,
  onMouseEnter,
  onMouseLeave,
  ...props
}: ButtonProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const computedStyle: React.CSSProperties = {
    ...baseStyles,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...(fullWidth && { width: '100%' }),
    ...(disabled && {
      opacity: 0.5,
      cursor: 'not-allowed',
      transform: 'none',
    }),
    ...(isHovered && !disabled && hoverStyles[variant]),
    ...style,
  };

  const iconElement = loading ? (
    <Loader2 size={size === 'sm' ? 14 : size === 'md' ? 16 : 18} style={{ animation: 'spin 1s linear infinite' }} />
  ) : icon ? (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>
  ) : null;

  return (
    <button
      {...props}
      className={className}
      style={computedStyle}
      disabled={disabled || loading}
      onMouseEnter={(e) => {
        setIsHovered(true);
        onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        setIsHovered(false);
        onMouseLeave?.(e);
      }}
    >
      {iconPosition === 'left' && iconElement}
      {children}
      {iconPosition === 'right' && iconElement}
    </button>
  );
}


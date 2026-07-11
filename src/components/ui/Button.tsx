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
    background: '#0f766e',
    color: '#ffffff',
    borderWidth: 0,
    borderStyle: 'solid',
    borderColor: 'transparent',
  },
  secondary: {
    background: '#ffffff',
    color: '#152331',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#d9e2ea',
  },
  success: {
    background: '#0f766e',
    color: '#ffffff',
    borderWidth: 0,
    borderStyle: 'solid',
    borderColor: 'transparent',
  },
  danger: {
    background: '#ef4444',
    color: '#fff',
    borderWidth: 0,
    borderStyle: 'solid',
    borderColor: 'transparent',
  },
  outline: {
    background: 'transparent',
    color: '#475569',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#cbd5e1',
  },
  ghost: {
    background: 'transparent',
    color: '#152331',
    borderWidth: 0,
    borderStyle: 'solid',
    borderColor: 'transparent',
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
  primary: { background: '#115e59', transform: 'translateY(-1px)' },
  secondary: { background: '#f8fafc', borderColor: '#c8d5df' },
  success: { background: '#115e59', transform: 'translateY(-1px)' },
  danger: { background: '#dc2626', transform: 'translateY(-1px)' },
  outline: { 
    background: '#f1f5f9', 
    borderColor: '#94a3b8',
    color: '#334155',
  },
  ghost: { background: 'rgba(15,31,46,0.06)' },
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


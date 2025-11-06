import React, { type InputHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const sizeStyles = {
  sm: { height: '32px', fontSize: '0.875rem', padding: '6px 12px' },
  md: { height: '40px', fontSize: '0.9375rem', padding: '8px 16px' },
  lg: { height: '48px', fontSize: '1rem', padding: '12px 20px' },
};

export function FormInput({
  label,
  error,
  helperText,
  icon,
  iconPosition = 'left',
  size = 'md',
  fullWidth = false,
  className = '',
  style,
  id,
  required,
  disabled,
  ...props
}: FormInputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  const baseInputStyles: React.CSSProperties = {
    width: fullWidth ? '100%' : 'auto',
    borderRadius: '8px',
    border: error 
      ? '1px solid #ef4444' 
      : '1px solid rgba(0,0,0,0.15)',
    transition: 'all 0.2s ease',
    outline: 'none',
    backgroundColor: disabled ? '#f1f5f9' : '#ffffff',
    color: '#1e293b',
    ...sizeStyles[size],
    ...(icon && iconPosition === 'left' && { paddingLeft: '40px' }),
    ...(icon && iconPosition === 'right' && { paddingRight: '40px' }),
  };

  const focusStyles: React.CSSProperties = {
    borderColor: error ? '#ef4444' : '#22c55e',
    boxShadow: error 
      ? '0 0 0 3px rgba(239, 68, 68, 0.1)' 
      : '0 0 0 3px rgba(34, 197, 94, 0.1)',
  };

  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <div style={{ marginBottom: '16px', width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <label
          htmlFor={inputId}
          style={{
            display: 'block',
            marginBottom: '6px',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: '#1e293b',
          }}
        >
          {label}
          {required && (
            <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>
          )}
        </label>
      )}
      
      <div style={{ position: 'relative' }}>
        {icon && iconPosition === 'left' && (
          <span
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {icon}
          </span>
        )}
        
        <input
          {...props}
          id={inputId}
          className={className}
          style={{
            ...baseInputStyles,
            ...(isFocused && focusStyles),
            ...style,
          }}
          disabled={disabled}
          required={required}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
        />
        
        {icon && iconPosition === 'right' && (
          <span
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            {icon}
          </span>
        )}
      </div>
      
      {error && (
        <div
          id={`${inputId}-error`}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '6px',
            fontSize: '0.875rem',
            color: '#ef4444',
          }}
        >
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}
      
      {helperText && !error && (
        <div
          id={`${inputId}-helper`}
          style={{
            marginTop: '6px',
            fontSize: '0.875rem',
            color: '#64748b',
          }}
        >
          {helperText}
        </div>
      )}
    </div>
  );
}


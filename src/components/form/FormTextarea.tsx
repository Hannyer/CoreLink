import React, { type TextareaHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';

export interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  showCharCount?: boolean;
  maxLength?: number;
}

const sizeStyles = {
  sm: { fontSize: '0.875rem', padding: '6px 12px', minHeight: '80px' },
  md: { fontSize: '0.9375rem', padding: '8px 16px', minHeight: '100px' },
  lg: { fontSize: '1rem', padding: '12px 20px', minHeight: '120px' },
};

export function FormTextarea({
  label,
  error,
  helperText,
  size = 'md',
  fullWidth = false,
  showCharCount = false,
  maxLength,
  className = '',
  style,
  id,
  required,
  disabled,
  value,
  ...props
}: FormTextareaProps) {
  const inputId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
  const currentLength = typeof value === 'string' ? value.length : 0;

  const baseTextareaStyles: React.CSSProperties = {
    width: fullWidth ? '100%' : 'auto',
    borderRadius: '8px',
    border: error 
      ? '1px solid #ef4444' 
      : '1px solid rgba(0,0,0,0.15)',
    transition: 'all 0.2s ease',
    outline: 'none',
    backgroundColor: disabled ? '#f1f5f9' : '#ffffff',
    color: '#1e293b',
    fontFamily: 'inherit',
    resize: 'vertical',
    ...sizeStyles[size],
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
      
      <textarea
        {...props}
        id={inputId}
        className={className}
        style={{
          ...baseTextareaStyles,
          ...(isFocused && focusStyles),
          ...style,
        }}
        disabled={disabled}
        required={required}
        value={value}
        maxLength={maxLength}
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
      
      {(showCharCount && maxLength) && (
        <div
          style={{
            marginTop: '4px',
            fontSize: '0.75rem',
            color: currentLength >= maxLength ? '#ef4444' : '#64748b',
            textAlign: 'right',
          }}
        >
          {currentLength} / {maxLength}
        </div>
      )}
      
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


import React, { type SelectHTMLAttributes, type ReactNode } from 'react';
import { AlertCircle, ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

export interface FormSelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  placeholder?: string;
}

const sizeStyles = {
  sm: { height: '32px', fontSize: '0.875rem', padding: '6px 32px 6px 12px' },
  md: { height: '40px', fontSize: '0.9375rem', padding: '8px 32px 8px 16px' },
  lg: { height: '48px', fontSize: '1rem', padding: '12px 32px 12px 20px' },
};

export function FormSelect({
  label,
  error,
  helperText,
  options,
  size = 'md',
  fullWidth = false,
  placeholder,
  className = '',
  style,
  id,
  required,
  disabled,
  value,
  ...props
}: FormSelectProps) {
  const inputId = id || `select-${Math.random().toString(36).substr(2, 9)}`;

  const baseSelectStyles: React.CSSProperties = {
    width: fullWidth ? '100%' : 'auto',
    borderRadius: '8px',
    border: error 
      ? '1px solid #ef4444' 
      : '1px solid rgba(0,0,0,0.15)',
    transition: 'all 0.2s ease',
    outline: 'none',
    backgroundColor: disabled ? '#f1f5f9' : '#ffffff',
    color: value === '' || value === undefined ? '#9ca3af' : '#1e293b',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    backgroundSize: '16px',
    cursor: disabled ? 'not-allowed' : 'pointer',
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
      
      <select
        {...props}
        id={inputId}
        className={className}
        style={{
          ...baseSelectStyles,
          ...(isFocused && focusStyles),
          ...style,
        }}
        disabled={disabled}
        required={required}
        value={value}
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
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
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


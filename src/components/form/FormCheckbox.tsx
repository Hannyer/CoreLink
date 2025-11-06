import React, { type InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';

export interface FormCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: { width: '16px', height: '16px' },
  md: { width: '20px', height: '20px' },
  lg: { width: '24px', height: '24px' },
};

export function FormCheckbox({
  label,
  error,
  helperText,
  size = 'md',
  className = '',
  style,
  id,
  checked,
  disabled,
  ...props
}: FormCheckboxProps) {
  const inputId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ position: 'relative', flexShrink: 0, marginTop: '2px' }}>
          <input
            {...props}
            type="checkbox"
            id={inputId}
            className={className}
            checked={checked}
            disabled={disabled}
            style={{
              ...sizeStyles[size],
              appearance: 'none',
              border: error 
                ? '2px solid #ef4444' 
                : checked 
                ? '2px solid #22c55e' 
                : '2px solid rgba(0,0,0,0.15)',
              borderRadius: '4px',
              backgroundColor: checked ? '#22c55e' : '#ffffff',
              cursor: disabled ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              outline: 'none',
              ...style,
            }}
            onFocus={(e) => {
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.boxShadow = 'none';
            }}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={
              error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
            }
          />
          {checked && (
            <Check
              size={size === 'sm' ? 12 : size === 'md' ? 14 : 16}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                color: '#ffffff',
                pointerEvents: 'none',
              }}
            />
          )}
        </div>
        
        {label && (
          <label
            htmlFor={inputId}
            style={{
              fontSize: '0.9375rem',
              color: disabled ? '#94a3b8' : '#1e293b',
              cursor: disabled ? 'not-allowed' : 'pointer',
              userSelect: 'none',
              flex: 1,
            }}
          >
            {label}
          </label>
        )}
      </div>
      
      {error && (
        <div
          id={`${inputId}-error`}
          style={{
            marginTop: '6px',
            fontSize: '0.875rem',
            color: '#ef4444',
          }}
        >
          {error}
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


import React, { useState, useEffect, type InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';
import { useDebounce } from '@/hooks/useDebounce';

export interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value?: string;
  onChange?: (value: string) => void;
  onDebouncedChange?: (value: string) => void;
  debounceDelay?: number;
  placeholder?: string;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  showClearButton?: boolean;
}

const sizeStyles = {
  sm: { height: '32px', fontSize: '0.875rem', padding: '6px 32px 6px 40px' },
  md: { height: '40px', fontSize: '0.9375rem', padding: '8px 36px 8px 40px' },
  lg: { height: '48px', fontSize: '1rem', padding: '12px 40px 12px 48px' },
};

export function SearchInput({
  value: controlledValue,
  onChange,
  onDebouncedChange,
  debounceDelay = 300,
  placeholder = 'Buscar...',
  size = 'md',
  fullWidth = false,
  showClearButton = true,
  className = '',
  style,
  ...props
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(controlledValue || '');
  const debouncedValue = useDebounce(internalValue, debounceDelay);

  // Sincronizar con valor controlado
  useEffect(() => {
    if (controlledValue !== undefined) {
      setInternalValue(controlledValue);
    }
  }, [controlledValue]);

  // Notificar cambios inmediatos
  useEffect(() => {
    if (onChange) {
      onChange(internalValue);
    }
  }, [internalValue, onChange]);

  // Notificar cambios debounced
  useEffect(() => {
    if (onDebouncedChange) {
      onDebouncedChange(debouncedValue);
    }
  }, [debouncedValue, onDebouncedChange]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
  };

  const handleClear = () => {
    setInternalValue('');
    if (onChange) onChange('');
    if (onDebouncedChange) onDebouncedChange('');
  };

  const currentValue = controlledValue !== undefined ? controlledValue : internalValue;

  return (
    <div style={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
      <Search
        size={size === 'sm' ? 16 : size === 'md' ? 18 : 20}
        style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#64748b',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
      
      <input
        {...props}
        type="text"
        value={currentValue}
        onChange={handleChange}
        placeholder={placeholder}
        className={className}
        style={{
          ...sizeStyles[size],
          width: fullWidth ? '100%' : 'auto',
          borderRadius: '8px',
          border: '1px solid rgba(0,0,0,0.15)',
          outline: 'none',
          backgroundColor: '#ffffff',
          color: '#1e293b',
          transition: 'all 0.2s ease',
          ...style,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#22c55e';
          e.currentTarget.style.boxShadow = '0 0 0 3px rgba(34, 197, 94, 0.1)';
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0,0,0,0.15)';
          e.currentTarget.style.boxShadow = 'none';
          props.onBlur?.(e);
        }}
      />
      
      {showClearButton && currentValue && (
        <button
          type="button"
          onClick={handleClear}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            color: '#64748b',
            transition: 'background 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f1f5f9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
          aria-label="Limpiar búsqueda"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}


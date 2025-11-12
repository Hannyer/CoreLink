import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';

// Re-exportar SelectOption para compatibilidad
export type { SelectOption } from './FormSelect';

export interface FormComboboxProps {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  value?: string | number;
  onChange?: (value: string | number) => void;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  searchPlaceholder?: string;
}

const sizeStyles = {
  sm: { height: '32px', fontSize: '0.875rem', padding: '6px 32px 6px 12px' },
  md: { height: '40px', fontSize: '0.9375rem', padding: '8px 32px 8px 16px' },
  lg: { height: '48px', fontSize: '1rem', padding: '12px 32px 12px 20px' },
};

export function FormCombobox({
  label,
  error,
  helperText,
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  placeholder = 'Seleccionar...',
  required,
  disabled,
  searchPlaceholder = 'Buscar...',
}: FormComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const inputId = `combobox-${Math.random().toString(36).substr(2, 9)}`;

  // Filtrar opciones basado en el término de búsqueda
  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Obtener el label de la opción seleccionada
  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : '';

  // Cerrar cuando se hace click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Enfocar el input de búsqueda cuando se abre
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Scroll al elemento enfocado
  useEffect(() => {
    if (focusedIndex >= 0 && listRef.current) {
      const focusedElement = listRef.current.children[focusedIndex] as HTMLElement;
      if (focusedElement) {
        focusedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex]);

  const handleSelect = (optionValue: string | number) => {
    if (onChange) {
      onChange(optionValue);
    }
    setIsOpen(false);
    setSearchTerm('');
    setFocusedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    switch (e.key) {
      case 'Enter':
        e.preventDefault();
        if (isOpen && focusedIndex >= 0 && filteredOptions[focusedIndex]) {
          handleSelect(filteredOptions[focusedIndex].value);
        } else if (!isOpen) {
          setIsOpen(true);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : prev
          );
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        }
        break;
      case 'Tab':
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
        break;
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChange) {
      onChange('');
    }
    setSearchTerm('');
  };

  const baseButtonStyles: React.CSSProperties = {
    width: fullWidth ? '100%' : 'auto',
    borderRadius: '8px',
    border: error ? '1px solid #ef4444' : '1px solid rgba(0,0,0,0.15)',
    transition: 'all 0.2s ease',
    outline: 'none',
    backgroundColor: disabled ? '#f1f5f9' : '#ffffff',
    color: value === '' || value === undefined ? '#9ca3af' : '#1e293b',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
    ...sizeStyles[size],
  };

  const focusStyles: React.CSSProperties = {
    border: error ? '1px solid #ef4444' : '1px solid #22c55e',
    boxShadow: error
      ? '0 0 0 3px rgba(239, 68, 68, 0.1)'
      : '0 0 0 3px rgba(34, 197, 94, 0.1)',
  };

  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      ref={containerRef}
      style={{ marginBottom: '16px', width: fullWidth ? '100%' : 'auto', position: 'relative' }}
    >
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
          {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          id={inputId}
          style={{
            ...baseButtonStyles,
            ...(isFocused && focusStyles),
          }}
          disabled={disabled}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-invalid={error ? 'true' : 'false'}
        >
          <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayValue || placeholder}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '8px' }}>
            {value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#64748b',
                }}
                aria-label="Limpiar selección"
              >
                <X size={14} />
              </button>
            )}
            <ChevronDown
              size={16}
              style={{
                color: '#64748b',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.2s',
              }}
            />
          </div>
        </button>

        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              marginTop: '4px',
              backgroundColor: '#ffffff',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              maxHeight: '300px',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Input de búsqueda */}
            <div style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{ position: 'relative' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#64748b',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setFocusedIndex(-1);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={searchPlaceholder}
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    outline: 'none',
                    fontSize: '0.875rem',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = '1px solid #22c55e';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = '1px solid #e2e8f0';
                  }}
                />
              </div>
            </div>

            {/* Lista de opciones */}
            <ul
              ref={listRef}
              role="listbox"
              style={{
                margin: 0,
                padding: '4px',
                listStyle: 'none',
                overflowY: 'auto',
                maxHeight: '240px',
              }}
            >
              {filteredOptions.length === 0 ? (
                <li
                  style={{
                    padding: '12px',
                    textAlign: 'center',
                    color: '#64748b',
                    fontSize: '0.875rem',
                  }}
                >
                  No se encontraron opciones
                </li>
              ) : (
                filteredOptions.map((option, index) => (
                  <li
                    key={option.value}
                    role="option"
                    aria-selected={option.value === value}
                    onClick={() => !option.disabled && handleSelect(option.value)}
                    style={{
                      padding: '10px 12px',
                      cursor: option.disabled ? 'not-allowed' : 'pointer',
                      backgroundColor:
                        index === focusedIndex
                          ? '#f1f5f9'
                          : option.value === value
                          ? '#ecfdf5'
                          : 'transparent',
                      color: option.disabled ? '#9ca3af' : '#1e293b',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      transition: 'background-color 0.15s',
                    }}
                    onMouseEnter={() => !option.disabled && setFocusedIndex(index)}
                  >
                    {option.label}
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '6px',
            fontSize: '0.875rem',
            color: '#ef4444',
          }}
        >
          <span>{error}</span>
        </div>
      )}

      {helperText && !error && (
        <div
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


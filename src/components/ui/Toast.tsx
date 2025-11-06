import React, { useEffect } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import type { Toast, ToastVariant } from '@/hooks/useToast';

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const variantStyles: Record<ToastVariant, React.CSSProperties> = {
  success: {
    background: '#ecfdf5',
    color: '#047857',
    borderColor: '#22c55e',
  },
  error: {
    background: '#fef2f2',
    color: '#b91c1c',
    borderColor: '#ef4444',
  },
  warning: {
    background: '#fffbeb',
    color: '#b45309',
    borderColor: '#f59e0b',
  },
  info: {
    background: '#eff6ff',
    color: '#1d4ed8',
    borderColor: '#3b82f6',
  },
};

const icons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle2 size={20} />,
  error: <AlertCircle size={20} />,
  warning: <AlertTriangle size={20} />,
  info: <Info size={20} />,
};

export function ToastComponent({ toast, onRemove, position = 'top-right' }: ToastProps) {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.id, onRemove]);

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-right': { top: '20px', right: '20px' },
    'top-left': { top: '20px', left: '20px' },
    'bottom-right': { bottom: '20px', right: '20px' },
    'bottom-left': { bottom: '20px', left: '20px' },
  };

  return (
    <div
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 10000,
        minWidth: '300px',
        maxWidth: '400px',
        background: variantStyles[toast.variant].background,
        color: variantStyles[toast.variant].color,
        border: `1px solid ${variantStyles[toast.variant].borderColor}`,
        borderRadius: '8px',
        padding: '12px 16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        {icons[toast.variant]}
      </span>
      <span style={{ flex: 1, fontSize: '0.875rem', lineHeight: '1.4' }}>
        {toast.message}
      </span>
      <button
        onClick={() => onRemove(toast.id)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          padding: '4px',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '4px',
          flexShrink: 0,
        }}
        aria-label="Cerrar notificación"
      >
        <X size={16} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export function ToastContainer({ toasts, onRemove, position = 'top-right' }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <>
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            position: 'fixed',
            zIndex: 10000 + index,
          }}
        >
          <ToastComponent
            toast={toast}
            onRemove={onRemove}
            position={position}
          />
        </div>
      ))}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(${position.includes('right') ? '100%' : '-100%'});
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}


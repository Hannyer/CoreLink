import React from 'react';
import { Loader2 } from 'lucide-react';

export type LoadingVariant = 'spinner' | 'skeleton' | 'pulse';
export type LoadingSize = 'sm' | 'md' | 'lg';

interface LoadingProps {
  variant?: LoadingVariant;
  size?: LoadingSize;
  fullScreen?: boolean;
  overlay?: boolean;
  message?: string;
  rows?: number; // Para skeleton
}

const sizeMap: Record<LoadingSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
};

const spinnerStyles: React.CSSProperties = {
  display: 'inline-block',
  animation: 'spin 1s linear infinite',
};

const pulseStyles: React.CSSProperties = {
  display: 'inline-block',
  animation: 'pulse 1.5s ease-in-out infinite',
};

const skeletonRowStyles: React.CSSProperties = {
  height: '16px',
  background: 'linear-gradient(90deg, rgba(255,255,255,0.08) 25%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-loading 1.5s ease-in-out infinite',
  borderRadius: '4px',
  marginBottom: '8px',
};

export function Loading({
  variant = 'spinner',
  size = 'md',
  fullScreen = false,
  overlay = false,
  message,
  rows = 3,
}: LoadingProps) {
  const sizePx = sizeMap[size];

  if (variant === 'skeleton') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={skeletonRowStyles} />
        ))}
      </div>
    );
  }

  const loadingContent = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        color: 'rgba(255,255,255,0.8)',
      }}
    >
      {variant === 'spinner' ? (
        <Loader2 size={sizePx} style={spinnerStyles} />
      ) : (
        <Loader2 size={sizePx} style={pulseStyles} />
      )}
      {message && (
        <span style={{ fontSize: '0.875rem' }}>{message}</span>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          background: overlay ? 'rgba(0,0,0,0.5)' : 'transparent',
          backdropFilter: overlay ? 'blur(2px)' : 'none',
        }}
      >
        {loadingContent}
      </div>
    );
  }

  return loadingContent;
}

// Añadir estilos CSS en el componente o importarlos globalmente
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @keyframes skeleton-loading {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;
if (!document.head.querySelector('#loading-styles')) {
  styleSheet.id = 'loading-styles';
  document.head.appendChild(styleSheet);
}


import React, { type ReactNode } from 'react';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: { padding: '32px 24px', iconSize: 48 },
  md: { padding: '48px 32px', iconSize: 64 },
  lg: { padding: '64px 48px', iconSize: 80 },
};

export function EmptyState({
  icon,
  title,
  message,
  action,
  size = 'md',
}: EmptyStateProps) {
  const config = sizeStyles[size];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: config.padding,
        color: '#64748b',
      }}
    >
      {icon && (
        <div
          style={{
            marginBottom: '16px',
            color: '#cbd5e1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {typeof icon === 'object' && 'type' in icon ? (
            React.cloneElement(icon as React.ReactElement, {
              size: config.iconSize,
            })
          ) : (
            <div style={{ fontSize: config.iconSize }}>{icon}</div>
          )}
        </div>
      )}

      <h3
        style={{
          margin: 0,
          marginBottom: message ? '8px' : '16px',
          fontSize: size === 'sm' ? '1rem' : size === 'md' ? '1.125rem' : '1.25rem',
          fontWeight: 600,
          color: '#1e293b',
        }}
      >
        {title}
      </h3>

      {message && (
        <p
          style={{
            margin: 0,
            marginBottom: action ? '16px' : 0,
            fontSize: size === 'sm' ? '0.875rem' : '0.9375rem',
            color: '#64748b',
            maxWidth: '400px',
            lineHeight: '1.5',
          }}
        >
          {message}
        </p>
      )}

      {action && <div>{action}</div>}
    </div>
  );
}


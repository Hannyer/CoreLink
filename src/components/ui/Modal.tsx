import React, { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'fullscreen';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: ModalSize;
  showCloseButton?: boolean;
  /** Se mantiene por compatibilidad; las modales no se cierran al hacer click fuera. */
  closeOnBackdropClick?: boolean;
  footer?: ReactNode;
  className?: string;
  /** Estilos del panel blanco (ancho fijo, minHeight, etc.) */
  panelStyle?: React.CSSProperties;
  /** Estilos del cuerpo con scroll */
  bodyStyle?: React.CSSProperties;
}

const sizeStyles: Record<ModalSize, React.CSSProperties> = {
  sm: { maxWidth: '400px' },
  md: { maxWidth: '600px' },
  lg: { maxWidth: '800px' },
  xl: { maxWidth: '1200px' },
  '2xl': { maxWidth: '1360px' },
  fullscreen: { maxWidth: '100%', width: '100%', height: '100%', margin: 0, borderRadius: 0 },
};

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
  footer,
  className = '',
  panelStyle,
  bodyStyle,
}: ModalProps) {
  const isMobile = useMediaQuery('(max-width: 767.98px)');

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1050,
        display: 'flex',
        alignItems: isMobile ? 'flex-start' : 'center',
        justifyContent: 'center',
        padding: isMobile ? '10px' : '24px',
        background:
          'linear-gradient(135deg, rgba(15,31,46,.58), rgba(15,118,110,.24)), rgba(15,31,46,.42)',
        backdropFilter: 'blur(8px)',
        animation: 'fadeIn 0.2s ease-out',
      }}
      className={className}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          border: '1px solid rgba(217,226,234,.95)',
          borderRadius: isMobile ? '16px' : '22px',
          width: '100%',
          maxHeight: isMobile ? 'calc(100dvh - 20px)' : '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 30px 90px rgba(15,31,46,.28)',
          animation: 'slideUp 0.3s ease-out',
          overflow: 'hidden',
          ...(isMobile ? { maxWidth: '100%' } : sizeStyles[size]),
          ...panelStyle,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: isMobile ? '16px 18px' : '22px 26px',
              borderBottom: '1px solid #d9e2ea',
              background:
                'linear-gradient(135deg, rgba(15,118,110,.08), rgba(15,31,46,.025))',
            }}
          >
            {title && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                <span
                  aria-hidden="true"
                  style={{
                    width: isMobile ? '34px' : '38px',
                    height: isMobile ? '34px' : '38px',
                    borderRadius: '12px',
                    flex: '0 0 auto',
                    background: 'linear-gradient(135deg, #0f766e, #115e59)',
                    boxShadow: '0 12px 24px rgba(15,118,110,.22)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '999px',
                      background: '#ffffff',
                      opacity: .95,
                    }}
                  />
                </span>
                <div style={{ minWidth: 0 }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: isMobile ? '1.05rem' : '1.22rem',
                      fontWeight: 750,
                      color: '#152331',
                      letterSpacing: '-.02em',
                      lineHeight: 1.2,
                    }}
                  >
                    {title}
                  </h2>
                  <div
                    style={{
                      marginTop: '3px',
                      color: '#667789',
                      fontSize: isMobile ? '.76rem' : '.82rem',
                    }}
                  >
                    Complete la información requerida para continuar
                  </div>
                </div>
              </div>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                style={{
                  background: '#ffffff',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderColor: '#d9e2ea',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  color: '#667789',
                  transition: 'background 0.2s, color 0.2s, border-color 0.2s, transform 0.2s',
                  boxShadow: '0 8px 18px rgba(15,31,46,.06)',
                  marginLeft: title ? 0 : 'auto',
                  flex: '0 0 auto',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f8fafc';
                  e.currentTarget.style.borderColor = '#c8d5df';
                  e.currentTarget.style.color = '#152331';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#d9e2ea';
                  e.currentTarget.style.color = '#667789';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
                aria-label="Cerrar modal"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div
          className="crm-modal-body"
          style={{
            flex: 1,
            padding: isMobile ? '18px' : '26px',
            overflowY: 'auto',
            color: '#152331',
            minHeight: 0,
            ...bodyStyle,
          }}
        >
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="crm-modal-footer"
            data-modal-footer
            style={{
              padding: isMobile ? '14px 18px' : '18px 26px',
              borderTop: '1px solid #d9e2ea',
              background: '#ffffff',
              display: 'flex',
              justifyContent: isMobile ? 'stretch' : 'flex-end',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            {footer}
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(18px) scale(.985);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .crm-modal-body .form-label {
          color: #667789 !important;
          font-size: .82rem;
          font-weight: 700;
          letter-spacing: .01em;
        }

        .crm-modal-body .form-control,
        .crm-modal-body .form-select,
        .crm-modal-body textarea,
        .crm-modal-body select,
        .crm-modal-body input:not([type="checkbox"]):not([type="radio"]) {
          border-color: #d9e2ea !important;
          border-radius: 12px !important;
          color: #152331 !important;
          background-color: #fff !important;
          min-height: 42px;
          box-shadow: none !important;
        }

        .crm-modal-body .form-control:focus,
        .crm-modal-body .form-select:focus,
        .crm-modal-body textarea:focus,
        .crm-modal-body select:focus,
        .crm-modal-body input:focus {
          border-color: rgba(15,118,110,.58) !important;
          box-shadow: 0 0 0 .2rem rgba(15,118,110,.12) !important;
        }

        .crm-modal-body .form-text,
        .crm-modal-body .text-muted,
        .crm-modal-body .text-white-50 {
          color: #667789 !important;
        }

        .crm-modal-body .card,
        .crm-modal-body .table-card,
        .crm-modal-body fieldset {
          border-color: #d9e2ea !important;
          border-radius: 16px !important;
        }

        .crm-modal-body .table {
          color: #152331;
          margin-bottom: 0;
        }

        .crm-modal-body .table thead th {
          color: #667789;
          background: #f8fafc;
          border-bottom-color: #d9e2ea;
          font-size: .78rem;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .crm-modal-body .table td,
        .crm-modal-body .table th {
          border-color: #e7edf2;
        }

        .crm-modal-footer .btn {
          border-radius: 12px;
          font-weight: 700;
          min-height: 40px;
          padding-left: 1rem;
          padding-right: 1rem;
        }

        .crm-modal-footer .btn-primary,
        .crm-modal-footer .btn-success {
          background: linear-gradient(135deg, #0f766e, #115e59) !important;
          border-color: #0f766e !important;
          box-shadow: 0 12px 24px rgba(15,118,110,.18);
        }

        .crm-modal-footer .btn-outline-secondary,
        .crm-modal-footer .btn-outline-light,
        .crm-modal-footer .btn-secondary {
          color: #152331 !important;
          background: #fff !important;
          border-color: #d9e2ea !important;
        }

        @media (max-width: 767.98px) {
          [data-modal-footer] > * {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}


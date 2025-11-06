import { useState, useCallback, type ReactElement } from 'react';
import { ConfirmDialog, type ConfirmVariant } from '@/components/ui/ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  message: string;
  variant?: ConfirmVariant;
  confirmText?: string;
  cancelText?: string;
}

export function useConfirm() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    message: '',
    variant: 'danger',
  });
  const [resolvePromise, setResolvePromise] = useState<((value: boolean) => void) | null>(null);
  const [loading, setLoading] = useState(false);

  const confirm = useCallback(
    (opts: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setOptions(opts);
        setIsOpen(true);
        setResolvePromise(() => resolve);
      });
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    setLoading(true);
    if (resolvePromise) {
      resolvePromise(true);
      setResolvePromise(null);
    }
    // Pequeño delay para mostrar el estado de loading
    setTimeout(() => {
      setLoading(false);
      setIsOpen(false);
    }, 300);
  }, [resolvePromise]);

  const handleCancel = useCallback(() => {
    if (resolvePromise) {
      resolvePromise(false);
      setResolvePromise(null);
    }
    setIsOpen(false);
    setLoading(false);
  }, [resolvePromise]);

  const ConfirmDialogComponent = useCallback((): ReactElement => {
    return (
      <ConfirmDialog
        isOpen={isOpen}
        onClose={handleCancel}
        onConfirm={handleConfirm}
        title={options.title}
        message={options.message}
        variant={options.variant}
        confirmText={options.confirmText}
        cancelText={options.cancelText}
        loading={loading}
      />
    );
  }, [isOpen, options, handleConfirm, handleCancel, loading]);

  return {
    confirm,
    ConfirmDialogComponent,
  };
}

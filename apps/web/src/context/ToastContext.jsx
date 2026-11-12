import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils/cn';

const ToastContext = createContext(null);

const toneStyles = {
  info: 'border-info/30 bg-surface-overlay text-text',
  success: 'border-success/30 bg-surface-overlay text-text',
  warning: 'border-warning/30 bg-surface-overlay text-text',
  error: 'border-danger/30 bg-surface-overlay text-text',
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, tone = 'info', ttl = 3500) => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), ttl);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ push, dismiss }), [push, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(100%-2rem,22rem)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm shadow-(--shadow-panel)',
              toneStyles[toast.tone],
            )}
            role="status"
          >
            <p className="flex-1 text-text-muted">{toast.message}</p>
            <button
              type="button"
              className="text-text-subtle hover:text-text"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

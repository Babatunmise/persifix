"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "info";

type ToastMessage = {
  id: number;
  type: ToastType;
  message: string;
  visible: boolean;
};

type ToastApi = {
  success: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [currentToast, setCurrentToast] = useState<ToastMessage | null>(null);
  const nextId = useRef(0);

  const showToast = useCallback((type: ToastType, message: string) => {
    nextId.current += 1;
    setCurrentToast({
      id: nextId.current,
      type,
      message,
      visible: true,
    });
  }, []);

  const dismissToast = useCallback(() => {
    setCurrentToast((toast) => (toast ? { ...toast, visible: false } : null));
  }, []);

  const toast = useMemo<ToastApi>(
    () => ({
      success: (message) => showToast("success", message),
      info: (message) => showToast("info", message),
    }),
    [showToast],
  );

  const currentToastId = currentToast?.id;

  useEffect(() => {
    if (currentToastId === undefined) return;

    const dismissTimer = window.setTimeout(() => {
      setCurrentToast((toastMessage) =>
        toastMessage?.id === currentToastId
          ? { ...toastMessage, visible: false }
          : toastMessage,
      );
    }, 2700);
    const removeTimer = window.setTimeout(() => {
      setCurrentToast((toastMessage) =>
        toastMessage?.id === currentToastId ? null : toastMessage,
      );
    }, 3000);

    return () => {
      window.clearTimeout(dismissTimer);
      window.clearTimeout(removeTimer);
    };
  }, [currentToastId]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex justify-center px-4 pb-safe">
        {currentToast && (
          <div
            role="status"
            aria-live="polite"
            className={`pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 px-5 py-4 text-[#F9F8F6] shadow-2xl shadow-black/40 transition-all duration-300 ease-out ${
              currentToast.visible
                ? "translate-y-0 opacity-100"
                : "translate-y-6 opacity-0"
            }`}
          >
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                currentToast.type === "success"
                  ? "bg-[#2E5B44]/30 text-[#8FBE9F]"
                  : "bg-neutral-800 text-neutral-300"
              }`}
              aria-hidden="true"
            >
              {currentToast.type === "success" ? "✓" : "i"}
            </span>
            <p className="min-w-0 flex-1 text-sm font-medium">
              {currentToast.message}
            </p>
            <button
              type="button"
              onClick={dismissToast}
              aria-label="Dismiss notification"
              className="rounded-full px-2 py-1 text-lg leading-none text-neutral-500 transition-colors hover:text-white"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) {
    throw new Error("useToast must be used within a ToastProvider.");
  }
  return toast;
}

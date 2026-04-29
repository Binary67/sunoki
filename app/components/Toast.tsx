"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

type ToastTone = "success" | "error";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
};

type Toast = ToastInput & { id: string; tone: ToastTone };

type ToastContextValue = {
  showToast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4000;

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function ToastCard({
  toast,
  onClose,
}: {
  toast: Toast;
  onClose: () => void;
}) {
  const isSuccess = toast.tone === "success";
  const containerClasses = isSuccess
    ? "bg-emerald-50 border-emerald-200"
    : "bg-red-50 border-red-200";
  const iconWrapClasses = isSuccess
    ? "bg-emerald-100 text-emerald-700"
    : "bg-red-100 text-red-700";
  const titleClasses = isSuccess ? "text-emerald-900" : "text-red-900";
  const descriptionClasses = isSuccess ? "text-emerald-800/80" : "text-red-800/80";

  return (
    <div
      role={isSuccess ? "status" : "alert"}
      aria-live={isSuccess ? "polite" : "assertive"}
      className={`pointer-events-auto flex w-80 items-start gap-3 rounded-xl border ${containerClasses} px-4 py-3 shadow-md`}
    >
      <span
        className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${iconWrapClasses}`}
        aria-hidden="true"
      >
        {isSuccess ? (
          <CheckIcon className="size-4" />
        ) : (
          <AlertIcon className="size-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-semibold ${titleClasses}`}>
          {toast.title}
        </div>
        {toast.description && (
          <div className={`mt-0.5 text-xs leading-5 ${descriptionClasses}`}>
            {toast.description}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss notification"
        className={`-mr-1 -mt-1 grid size-6 shrink-0 place-items-center rounded-full ${
          isSuccess
            ? "text-emerald-700/70 hover:bg-emerald-100"
            : "text-red-700/70 hover:bg-red-100"
        }`}
      >
        <CloseIcon className="size-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((input: ToastInput) => {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const toast: Toast = {
      id,
      tone: input.tone ?? "success",
      title: input.title,
      description: input.description,
    };
    setToasts((current) => [...current, toast]);
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      setTimeout(() => dismiss(toast.id), TOAST_DURATION_MS),
    );
    return () => {
      for (const timer of timers) clearTimeout(timer);
    };
  }, [toasts, dismiss]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <ToastCard
            key={toast.id}
            toast={toast}
            onClose={() => dismiss(toast.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

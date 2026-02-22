“use client”;

import { useEffect, useState, useCallback, createContext, useContext, useRef } from “react”;
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from “lucide-react”;

export type ToastType = “success” | “error” | “info” | “warning”;

export type Toast = {
id: string;
type: ToastType;
title: string;
message?: string;
duration?: number;
};

type ToastContextValue = {
toast: (opts: Omit<Toast, “id”>) => void;
success: (title: string, message?: string) => void;
error: (title: string, message?: string) => void;
info: (title: string, message?: string) => void;
warning: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastItem({ t, onDismiss }: { t: Toast; onDismiss: (id: string) => void }) {
const [visible, setVisible] = useState(false);
const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
// Trigger entrance animation
const enter = setTimeout(() => setVisible(true), 10);
const dur = t.duration ?? (t.type === “error” ? 6000 : 4000);
timerRef.current = setTimeout(() => {
setVisible(false);
setTimeout(() => onDismiss(t.id), 300);
}, dur);
return () => {
clearTimeout(enter);
if (timerRef.current) clearTimeout(timerRef.current);
};
}, [t, onDismiss]);

const icon = {
success: <CheckCircle size={16} className="text-emerald-500 shrink-0" />,
error: <AlertCircle size={16} className="text-rose-500 shrink-0" />,
warning: <AlertTriangle size={16} className="text-amber-500 shrink-0" />,
info: <Info size={16} className="text-[rgb(var(--hi5-accent))] shrink-0" />,
}[t.type];

const accent = {
success: “border-l-emerald-500”,
error: “border-l-rose-500”,
warning: “border-l-amber-500”,
info: “border-l-[rgb(var(–hi5-accent))]”,
}[t.type];

return (
<div
className={[
“flex items-start gap-3 p-4 rounded-2xl border hi5-border border-l-4”,
“hi5-panel shadow-lg min-w-[280px] max-w-[360px] w-full”,
accent,
“transition-all duration-300”,
visible ? “opacity-100 translate-y-0” : “opacity-0 translate-y-2”,
].join(” “)}
role=“alert”
>
<div className="mt-0.5">{icon}</div>
<div className="flex-1 min-w-0">
<div className="text-sm font-semibold">{t.title}</div>
{t.message ? (
<div className="text-xs opacity-70 mt-0.5">{t.message}</div>
) : null}
</div>
<button
type=“button”
onClick={() => {
setVisible(false);
setTimeout(() => onDismiss(t.id), 300);
}}
className=“shrink-0 opacity-60 hover:opacity-100 transition rounded-lg p-0.5”
aria-label=“Dismiss”
>
<X size={14} />
</button>
</div>
);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
const [toasts, setToasts] = useState<Toast[]>([]);

const dismiss = useCallback((id: string) => {
setToasts((prev) => prev.filter((t) => t.id !== id));
}, []);

const addToast = useCallback((opts: Omit<Toast, “id”>) => {
const id = Math.random().toString(36).slice(2);
setToasts((prev) => […prev.slice(-4), { …opts, id }]);
}, []);

const ctx: ToastContextValue = {
toast: addToast,
success: (title, message) => addToast({ type: “success”, title, message }),
error: (title, message) => addToast({ type: “error”, title, message }),
info: (title, message) => addToast({ type: “info”, title, message }),
warning: (title, message) => addToast({ type: “warning”, title, message }),
};

return (
<ToastContext.Provider value={ctx}>
{children}
{/* Toast stack - bottom right on desktop, bottom centre on mobile */}
<div
className=“fixed z-[9999] flex flex-col gap-2 pointer-events-none”
style={{
bottom: “calc(env(safe-area-inset-bottom, 0px) + 16px)”,
right: 0,
left: 0,
padding: “0 16px”,
alignItems: “flex-end”,
}}
>
{toasts.map((t) => (
<div key={t.id} className="pointer-events-auto w-full sm:w-auto">
<ToastItem t={t} onDismiss={dismiss} />
</div>
))}
</div>
</ToastContext.Provider>
);
}

export function useToast() {
const ctx = useContext(ToastContext);
if (!ctx) throw new Error(“useToast must be used inside <ToastProvider>”);
return ctx;
}

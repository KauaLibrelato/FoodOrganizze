"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = {
  id: number;
  title: string;
  description?: string;
  tone?: "success" | "error";
};

const STORAGE_KEY = "foodorganizze:toast";

export function queueToast(toast: Omit<Toast, "id">) {
  if (typeof window === "undefined") return;

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toast));
  window.dispatchEvent(new CustomEvent("foodorganizze:toast", { detail: toast }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const queuedToast = sessionStorage.getItem(STORAGE_KEY);

    if (queuedToast) {
      sessionStorage.removeItem(STORAGE_KEY);
      try {
        addToast(JSON.parse(queuedToast));
      } catch {
        addToast({ title: "Ação concluída", tone: "success" });
      }
    }

    function handleToast(event: Event) {
      const customEvent = event as CustomEvent<Omit<Toast, "id">>;
      addToast(customEvent.detail);
    }

    window.addEventListener("foodorganizze:toast", handleToast);
    return () => window.removeEventListener("foodorganizze:toast", handleToast);
  }, []);

  function addToast(toast: Omit<Toast, "id">) {
    const id = Date.now();
    setToasts((currentToasts) => [...currentToasts, { ...toast, id }]);
    window.setTimeout(() => {
      setToasts((currentToasts) => currentToasts.filter((item) => item.id !== id));
    }, 3600);
  }

  return (
    <div className="fixed right-4 top-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
      {toasts.map((toast) => {
        const isError = toast.tone === "error";
        const Icon = isError ? XCircle : CheckCircle2;

        return (
          <div
            key={toast.id}
            className={cn(
              "rounded-xl border bg-card p-4 shadow-lg",
              isError ? "border-rose-200" : "border-emerald-200",
            )}
          >
            <div className="flex gap-3">
              <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", isError ? "text-rose-700" : "text-emerald-700")} />
              <div>
                <p className="font-semibold text-cocoa-800">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-sm leading-6 text-cocoa-500">{toast.description}</p>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

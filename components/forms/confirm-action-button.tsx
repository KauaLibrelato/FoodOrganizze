"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { queueToast } from "@/components/ui/toaster";

type ConfirmActionButtonProps = ButtonProps & {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  successTitle: string;
  successDescription?: string;
  tone?: "default" | "danger";
  children: ReactNode;
};

export function ConfirmActionButton({
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancelar",
  successTitle,
  successDescription,
  tone = "default",
  children,
  formAction,
  ...buttonProps
}: ConfirmActionButtonProps) {
  const submitRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  function confirm() {
    queueToast({
      title: successTitle,
      description: successDescription,
      tone: "success",
    });
    setOpen(false);
    submitRef.current?.click();
  }

  return (
    <>
      <Button {...buttonProps} type="button" onClick={() => setOpen(true)}>
        {children}
      </Button>
      <button ref={submitRef} type="submit" formAction={formAction} className="hidden" />

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa-900/35 p-4">
          <div className="w-full max-w-md rounded-2xl border border-cream-300 bg-card p-5 shadow-xl">
            <div className="flex gap-3">
              <div
                className={
                  tone === "danger"
                    ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-700"
                    : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush-50 text-brand-700"
                }
              >
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-cocoa-800">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-cocoa-500">{description}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                {cancelLabel}
              </Button>
              <Button
                type="button"
                variant={tone === "danger" ? "outline" : "default"}
                className={
                  tone === "danger"
                    ? "border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800"
                    : undefined
                }
                onClick={confirm}
              >
                {confirmLabel}
              </Button>
            </div>
          </div>
          <button
            type="button"
            className="absolute inset-0 -z-10 cursor-default"
            aria-label="Fechar confirmação"
            onClick={() => setOpen(false)}
          />
        </div>
      ) : null}
    </>
  );
}

type ToastSubmitButtonProps = ButtonProps & {
  successTitle: string;
  successDescription?: string;
};

export function ToastSubmitButton({
  successTitle,
  successDescription,
  onClick,
  ...buttonProps
}: ToastSubmitButtonProps) {
  return (
    <Button
      {...buttonProps}
      type="submit"
      onClick={(event) => {
        queueToast({
          title: successTitle,
          description: successDescription,
          tone: "success",
        });
        onClick?.(event);
      }}
    />
  );
}

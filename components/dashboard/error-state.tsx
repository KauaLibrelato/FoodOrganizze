"use client";

import { useEffect } from "react";
import { AlertTriangle, Home, RotateCcw } from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ErrorStateProps = {
  error?: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  description?: string;
  fullScreen?: boolean;
};

export function ErrorState({
  error,
  reset,
  title = "Algo não saiu como esperado",
  description = "A tela não conseguiu carregar agora. Tente novamente em alguns segundos.",
  fullScreen = false,
}: ErrorStateProps) {
  useEffect(() => {
    if (error) {
      console.error(error);
    }

    window.dispatchEvent(
      new CustomEvent("foodorganizze:toast", {
        detail: {
          title: "Não foi possível carregar",
          description: "Tente novamente ou volte para o início.",
          tone: "error",
        },
      }),
    );
  }, [error]);

  return (
    <div
      className={cn(
        "flex items-center justify-center p-6",
        fullScreen ? "min-h-screen bg-background" : "min-h-[60vh]",
      )}
    >
      <div className="w-full max-w-md rounded-2xl border border-cream-300 bg-card p-6 text-center shadow-sm">
        {fullScreen ? <BrandLogo className="mx-auto mb-5 w-36 justify-center" /> : null}
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-700">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-cocoa-800">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-cocoa-500">{description}</p>
        {error?.digest ? (
          <p className="mt-3 rounded-xl bg-cream-50 px-3 py-2 text-xs font-medium text-cocoa-500">
            Código do erro: {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {reset ? (
            <Button type="button" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              Tentar novamente
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href="/dashboard">
              <Home className="h-4 w-4" />
              Ir para o início
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { ErrorState } from "@/components/dashboard/error-state";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      error={error}
      reset={reset}
      fullScreen
      title="Não deu para abrir o acesso"
      description="A tela de entrada falhou ao carregar. Tente novamente ou volte para o início."
    />
  );
}

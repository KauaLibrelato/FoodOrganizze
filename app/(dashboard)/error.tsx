"use client";

import { ErrorState } from "@/components/dashboard/error-state";

export default function DashboardError({
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
      title="Não deu para carregar esta área"
      description="Alguma informação da tela falhou ao carregar. Tente novamente sem perder o que já está salvo."
    />
  );
}

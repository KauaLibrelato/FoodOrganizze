"use client";

import { ErrorState } from "@/components/dashboard/error-state";

export default function ErrorPage({
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
      description="A ação não foi concluída. Confira os dados e tente de novo."
    />
  );
}

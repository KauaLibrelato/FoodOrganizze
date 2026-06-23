import { PageLoading } from "@/components/dashboard/page-loading";

export default function Loading() {
  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-7xl">
        <PageLoading />
      </div>
    </main>
  );
}

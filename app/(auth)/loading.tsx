import { BrandLogo } from "@/components/brand/brand-logo";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthLoading() {
  return (
    <main className="min-h-screen overflow-hidden bg-background px-4 py-4 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-md flex-col items-center justify-center">
        <BrandLogo className="mb-4 w-24 justify-center" />
        <Card className="w-full">
          <CardHeader className="pb-3">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-56" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

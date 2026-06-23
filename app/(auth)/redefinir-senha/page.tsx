import { BrandLogo } from "@/components/brand/brand-logo";
import { ResetPasswordForm } from "@/components/forms/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-background px-4 py-4 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-md flex-col items-center justify-center">
        <div className="mb-4 flex flex-col items-center text-center">
          <BrandLogo className="w-24 justify-center" />
          <p className="mt-3 max-w-sm text-sm leading-6 text-cocoa-500">
            Crie uma nova senha para voltar à rotina da Casa Fratoni.
          </p>
        </div>
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl">Redefinir senha</CardTitle>
            <CardDescription>Crie uma nova senha para voltar à rotina.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResetPasswordForm />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

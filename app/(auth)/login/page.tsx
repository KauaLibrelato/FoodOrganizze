import { requestPasswordResetAction, signInAction } from "@/app/actions";
import { BrandLogo } from "@/components/brand/brand-logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isDemoModeAllowed, isSupabaseConfigured } from "@/lib/env";

type LoginPageProps = {
  searchParams?: Promise<{
    erro?: string;
    sucesso?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  campos: "Preencha e-mail e senha para continuar.",
  credenciais: "E-mail ou senha inválidos.",
  acesso: "Seu usuário precisa ser cadastrado antes de entrar.",
  config: "A configuração de acesso ainda não está pronta. Revise as variáveis do Supabase.",
  limite: "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
  reset: "Não foi possível enviar o e-mail de redefinição. Tente novamente.",
  reset_config: "A validação de usuários ainda não está configurada no banco.",
};

const successMessages: Record<string, string> = {
  reset: "Enviamos o link de redefinição para o e-mail cadastrado.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const demoMode = !isSupabaseConfigured() && isDemoModeAllowed();
  const params = await searchParams;
  const errorMessage = params?.erro ? errorMessages[params.erro] ?? errorMessages.acesso : null;
  const successMessage = params?.sucesso ? successMessages[params.sucesso] : null;

  return (
    <main className="min-h-screen overflow-hidden bg-background px-4 py-4 sm:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-md flex-col items-center justify-center">
        <div className="mb-4 flex flex-col items-center text-center">
          <BrandLogo className="w-24 justify-center" />
          <p className="mt-3 max-w-sm text-sm leading-6 text-cocoa-500">
            Pedidos, custos e produção da Casa Fratoni em um só lugar.
          </p>
        </div>
        <Card className="w-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-2xl">Entrar</CardTitle>
            <CardDescription>Acesso somente para usuários cadastrados.</CardDescription>
          </CardHeader>
          <CardContent>
            {demoMode ? (
              <div className="mb-5 rounded-xl border border-blush-200 bg-blush-50 p-4 text-sm leading-6 text-cocoa-600">
                Supabase ainda não está configurado. Dá para entrar em demonstração.
              </div>
            ) : null}
            {errorMessage ? (
              <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                {errorMessage}
              </div>
            ) : null}
            {successMessage ? (
              <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
                {successMessage}
              </div>
            ) : null}
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" required type="email" placeholder="voce@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  minLength={6}
                  name="password"
                  required
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <Button className="w-full" formAction={signInAction} type="submit">
                {demoMode ? "Entrar em demonstração" : "Entrar"}
              </Button>
            </form>
            {!demoMode ? (
              <details className="mt-4 rounded-xl border border-cream-300 bg-cream-50 p-3">
                <summary className="cursor-pointer text-sm font-semibold text-cocoa-700">
                  Esqueci minha senha
                </summary>
                <form action={requestPasswordResetAction} className="mt-3">
                  <div className="space-y-2">
                    <Label htmlFor="reset_email">E-mail cadastrado</Label>
                    <Input id="reset_email" name="reset_email" required type="email" placeholder="voce@email.com" />
                  </div>
                  <Button className="mt-3 w-full" type="submit" variant="outline">
                    Enviar link de redefinição
                  </Button>
                </form>
              </details>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

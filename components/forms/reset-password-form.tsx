"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queueToast } from "@/components/ui/toaster";
import { createClient } from "@/lib/supabase/client";

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password.length < 6) {
      queueToast({
        title: "Senha muito curta",
        description: "Use pelo menos 6 caracteres.",
        tone: "error",
      });
      return;
    }

    if (password !== confirmation) {
      queueToast({
        title: "As senhas não conferem",
        description: "Digite a mesma senha nos dois campos.",
        tone: "error",
      });
      return;
    }

    setIsSaving(true);

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    setIsSaving(false);

    if (error) {
      queueToast({
        title: "Não foi possível salvar",
        description: "Abra o link de redefinição mais recente e tente novamente.",
        tone: "error",
      });
      return;
    }

    await supabase.auth.signOut();
    queueToast({
      title: "Senha alterada",
      description: "Entre novamente usando a nova senha.",
      tone: "success",
    });
    router.push("/login");
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="space-y-2">
        <Label htmlFor="new_password">Nova senha</Label>
        <Input
          id="new_password"
          minLength={6}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Mínimo 6 caracteres"
          required
          type="password"
          value={password}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password_confirmation">Confirmar senha</Label>
        <Input
          id="password_confirmation"
          minLength={6}
          onChange={(event) => setConfirmation(event.target.value)}
          placeholder="Repita a nova senha"
          required
          type="password"
          value={confirmation}
        />
      </div>
      <Button className="w-full" disabled={isSaving} type="submit">
        {isSaving ? "Salvando..." : "Salvar nova senha"}
      </Button>
    </form>
  );
}

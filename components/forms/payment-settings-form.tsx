import { CreditCard, Save } from "lucide-react";
import { updatePaymentSettingsAction } from "@/app/actions";
import { ToastSubmitButton } from "@/components/forms/confirm-action-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BusinessPaymentSettings } from "@/types";

type PaymentSettingsFormProps = {
  settings?: BusinessPaymentSettings | null;
};

const textareaClassName =
  "min-h-24 w-full rounded-xl border border-input bg-card px-3 py-2 text-sm text-cocoa-800 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function PaymentSettingsForm({ settings }: PaymentSettingsFormProps) {
  return (
    <form action={updatePaymentSettingsAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="pix_key">Chave Pix</Label>
          <Input id="pix_key" name="pix_key" defaultValue={settings?.pixKey ?? ""} placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pix_holder_name">Nome do favorecido</Label>
          <Input id="pix_holder_name" name="pix_holder_name" defaultValue={settings?.pixHolderName ?? ""} placeholder="Ex.: Casa Fratoni" />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bank_name">Banco</Label>
          <Input id="bank_name" name="bank_name" defaultValue={settings?.bankName ?? ""} placeholder="Ex.: Nubank, Itaú, Santander" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment_link">Link de pagamento</Label>
          <Input id="payment_link" name="payment_link" type="url" defaultValue={settings?.paymentLink ?? ""} placeholder="https://..." />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payment_instructions">Mensagem para o cliente</Label>
        <textarea
          id="payment_instructions"
          name="payment_instructions"
          className={textareaClassName}
          defaultValue={settings?.paymentInstructions ?? ""}
          placeholder="Ex.: Envie o comprovante pelo WhatsApp para confirmarmos o pedido."
        />
      </div>

      <ToastSubmitButton successTitle="Dados salvos" successDescription="Orçamentos e PDFs vão usar essas informações." className="w-full sm:w-auto">
        <Save className="h-4 w-4" />
        Salvar dados de pagamento
      </ToastSubmitButton>

      <div className="rounded-xl border border-cream-300 bg-cream-50 px-3 py-2 text-sm text-cocoa-500">
        <CreditCard className="mr-2 inline h-4 w-4 text-brand-700" />
        Esses dados aparecem apenas no orçamento e no PDF enviado ao cliente.
      </div>
    </form>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { deleteCustomerAction, updateCustomerAction } from "@/app/actions";
import { ToastSubmitButton } from "@/components/forms/confirm-action-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { queueToast } from "@/components/ui/toaster";
import type { Customer } from "@/types";

type CustomerEditorProps = {
  customer: Customer;
};

type CustomerFormValues = {
  name: string;
  phone: string;
  address: string;
  notes: string;
};

function getInitialValues(customer: Customer): CustomerFormValues {
  return {
    name: customer.name,
    phone: customer.phone ?? "",
    address: customer.address ?? "",
    notes: customer.notes ?? "",
  };
}

export function CustomerEditor({ customer }: CustomerEditorProps) {
  const router = useRouter();
  const initialValues = useMemo(() => getInitialValues(customer), [customer]);
  const [values, setValues] = useState(initialValues);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);

  useEffect(() => {
    setValues(initialValues);
    setDeleteModalOpen(false);
    setCancelModalOpen(false);
  }, [initialValues]);

  const hasChanges =
    values.name !== initialValues.name ||
    values.phone !== initialValues.phone ||
    values.address !== initialValues.address ||
    values.notes !== initialValues.notes;

  function updateField(field: keyof CustomerFormValues, value: string) {
    setValues((currentValues) => ({
      ...currentValues,
      [field]: value,
    }));
  }

  function handleCancel() {
    if (hasChanges) {
      setCancelModalOpen(true);
      return;
    }

    router.push("/clientes");
  }

  return (
    <div className="space-y-4">
      <form action={updateCustomerAction} className="space-y-4">
        <input type="hidden" name="customer_id" value={customer.id} />
        <div className="space-y-2">
          <Label htmlFor="edit-name">Nome</Label>
          <Input
            id="edit-name"
            name="name"
            required
            value={values.name}
            onChange={(event) => updateField("name", event.target.value)}
            placeholder="Ex.: Marina Alves"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-phone">Telefone</Label>
          <Input
            id="edit-phone"
            name="phone"
            value={values.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            placeholder="(11) 99999-9999"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-address">Endereço</Label>
          <Input
            id="edit-address"
            name="address"
            value={values.address}
            onChange={(event) => updateField("address", event.target.value)}
            placeholder="Rua, número, bairro"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-notes">Observações</Label>
          <Input
            id="edit-notes"
            name="notes"
            value={values.notes}
            onChange={(event) => updateField("notes", event.target.value)}
            placeholder="Preferências, restrições, combinados"
          />
        </div>
        <ToastSubmitButton className="w-full" successTitle="Cliente atualizado">
          Salvar alterações
        </ToastSubmitButton>
      </form>

      <div className="flex flex-col gap-3 border-t border-cream-300 pt-4 sm:flex-row">
        <Button type="button" variant="outline" className="flex-1" onClick={handleCancel}>
          Cancelar edição
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800"
          onClick={() => setDeleteModalOpen(true)}
        >
          <Trash2 className="h-4 w-4" />
          Excluir cliente
        </Button>
      </div>

      {deleteModalOpen ? (
        <ConfirmModal
          title="Excluir cliente?"
          description={`Isso remove o cadastro de ${customer.name}. Pedidos antigos continuam salvos, mas ficam sem cliente vinculado.`}
          tone="danger"
          onClose={() => setDeleteModalOpen(false)}
        >
          <form action={deleteCustomerAction} className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <input type="hidden" name="customer_id" value={customer.id} />
            <Button type="button" variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Manter cliente
            </Button>
            <Button
              type="submit"
              variant="outline"
              className="border-rose-200 bg-rose-50 text-rose-700 hover:border-rose-300 hover:bg-rose-100 hover:text-rose-800"
              onClick={() => queueToast({ title: "Cliente excluído", tone: "success" })}
            >
              Excluir mesmo assim
            </Button>
          </form>
        </ConfirmModal>
      ) : null}

      {cancelModalOpen ? (
        <ConfirmModal
          title="Descartar alterações?"
          description="Você alterou informações deste cliente. Se cancelar agora, essas mudanças não serão salvas."
          onClose={() => setCancelModalOpen(false)}
        >
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setCancelModalOpen(false)}>
              Continuar editando
            </Button>
            <Button type="button" onClick={() => router.push("/clientes")}>
              Descartar alterações
            </Button>
          </div>
        </ConfirmModal>
      ) : null}
    </div>
  );
}

type ConfirmModalProps = {
  title: string;
  description: string;
  tone?: "default" | "danger";
  children: ReactNode;
  onClose: () => void;
};

function ConfirmModal({ title, description, tone = "default", children, onClose }: ConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-cocoa-900/35 p-4">
      <div className="w-full max-w-md rounded-2xl border border-cream-300 bg-card p-5 shadow-xl">
        <div className="flex gap-3">
          <div
            className={
              tone === "danger"
                ? "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-700"
                : "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blush-50 text-brand-700"
            }
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-cocoa-800">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-cocoa-500">{description}</p>
          </div>
        </div>
        <div className="mt-5">{children}</div>
      </div>
      <button
        type="button"
        className="absolute inset-0 -z-10 cursor-default"
        aria-label="Fechar aviso"
        onClick={onClose}
      />
    </div>
  );
}

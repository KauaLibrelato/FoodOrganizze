import Link from "next/link";
import {
  CalendarDays,
  Pencil,
  Plus,
  ReceiptText,
  Trash2,
} from "lucide-react";
import {
  createBusinessExpenseAction,
  deleteBusinessExpenseAction,
  updateBusinessExpenseAction,
} from "@/app/actions";
import { SectionCard } from "@/components/cards/section-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { PageTitle } from "@/components/dashboard/page-title";
import { ConfirmActionButton, ToastSubmitButton } from "@/components/forms/confirm-action-button";
import { CurrencyInput } from "@/components/forms/currency-input";
import { ManagementPeriodFilter } from "@/components/forms/management-period-filter";
import { PaymentSettingsForm } from "@/components/forms/payment-settings-form";
import { ProfitDistributionForm } from "@/components/forms/profit-distribution-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/calculations";
import { getBusinessPaymentSettings, getManagementData } from "@/lib/data";
import type { ExpenseCategory } from "@/types";

type FinancePageProps = {
  searchParams?: Promise<{
    periodo?: string;
    inicio?: string;
    fim?: string;
  }>;
};

const periodOptions = [
  { value: "hoje", label: "Hoje" },
  { value: "esta-semana", label: "Esta semana" },
  { value: "este-mes", label: "Este mês" },
  { value: "mes-anterior", label: "Mês anterior" },
  { value: "personalizado", label: "Período personalizado" },
];

const expenseCategories: ExpenseCategory[] = [
  "Ingredientes",
  "Embalagens",
  "Entregas",
  "Marketing",
  "Energia",
  "Água",
  "Aluguel",
  "Equipamentos",
  "Manutenção",
  "Pró-labore",
  "Outros",
];

export default async function FinancePage({ searchParams }: FinancePageProps) {
  const params = await searchParams;
  const [management, paymentSettings] = await Promise.all([
    getManagementData({
      periodo: params?.periodo,
      inicio: params?.inicio,
      fim: params?.fim,
    }),
    getBusinessPaymentSettings(),
  ]);

  const { filters, summary, distributionSettings } = management;
  const periodLabel =
    periodOptions.find((option) => option.value === filters.period)?.label ?? "Este mês";

  return (
    <div className="space-y-6">
      <PageTitle
        title="Financeiro"
        description="Cadastre despesas e defina como o lucro líquido deve ser dividido."
        action={
          <Button asChild variant="outline">
            <Link href="/gestao">Ver gestão</Link>
          </Button>
        }
      />

      <SectionCard title="Período das despesas" description="Use o filtro para consultar e editar lançamentos por data.">
        <ManagementPeriodFilter
          period={filters.period}
          startDate={filters.startDate}
          endDate={filters.endDate}
          actionPath="/financeiro"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="cream">
            <CalendarDays className="mr-1 h-3.5 w-3.5" />
            {periodLabel}
          </Badge>
          <Badge variant="outline">
            {formatDate(filters.startDate)} até {formatDate(filters.endDate)}
          </Badge>
          <Badge variant="rose">{formatCurrency(summary.expenses)} em despesas</Badge>
        </div>
      </SectionCard>

      <SectionCard title="Distribuição do lucro" description="Configure apenas os percentuais. A Gestão calcula os valores com o lucro do período.">
        <ProfitDistributionForm settings={distributionSettings} />
      </SectionCard>

      <SectionCard title="Dados de pagamento" description="Defina Pix, favorecido e link para aparecerem nos orçamentos enviados aos clientes.">
        <PaymentSettingsForm settings={paymentSettings} />
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Lançar despesa" description="Registre saídas que não vêm diretamente dos pedidos.">
          <form action={createBusinessExpenseAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input id="description" name="description" required placeholder="Ex.: Conta de energia" />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <select
                  id="category"
                  name="category"
                  className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-cocoa-700"
                  defaultValue="Outros"
                >
                  {expenseCategories.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Valor</Label>
                <CurrencyInput id="amount" name="amount" required placeholder="250,00" />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="expense_date">Data</Label>
                <Input id="expense_date" name="expense_date" required type="date" defaultValue={filters.endDate} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observação</Label>
                <Input id="notes" name="notes" placeholder="Ex.: referente a junho" />
              </div>
            </div>
            <ToastSubmitButton successTitle="Despesa cadastrada" successDescription="O lançamento entrou na gestão." className="w-full">
              <Plus className="h-4 w-4" />
              Cadastrar despesa
            </ToastSubmitButton>
          </form>
        </SectionCard>

        <SectionCard title="Despesas do período" contentClassName="space-y-3">
          {management.periodExpenses.length === 0 ? (
            <EmptyState
              title="Nenhuma despesa no período"
              description="Cadastre uma despesa ou ajuste o filtro para consultar outros lançamentos."
              icon={<ReceiptText className="h-9 w-9" />}
            />
          ) : (
            management.periodExpenses.map((expense) => (
              <details key={expense.id} className="rounded-xl border border-cream-300 bg-card p-4 shadow-sm">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold text-cocoa-800">{expense.description}</p>
                      <p className="mt-1 text-sm text-cocoa-500">
                        {expense.category} · {formatDate(expense.expenseDate)}
                      </p>
                    </div>
                    <p className="text-lg font-semibold text-brand-700">{formatCurrency(expense.amount)}</p>
                  </div>
                </summary>

                <form action={updateBusinessExpenseAction} className="mt-4 border-t border-cream-300 pt-4">
                  <input type="hidden" name="expense_id" value={expense.id} />
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`description-${expense.id}`}>Descrição</Label>
                      <Input id={`description-${expense.id}`} name="description" required defaultValue={expense.description} placeholder="Ex.: Conta de energia" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`category-${expense.id}`}>Categoria</Label>
                      <select
                        id={`category-${expense.id}`}
                        name="category"
                        className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm text-cocoa-700"
                        defaultValue={expense.category}
                      >
                        {expenseCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`amount-${expense.id}`}>Valor</Label>
                      <CurrencyInput id={`amount-${expense.id}`} name="amount" required defaultValue={expense.amount.toFixed(2).replace(".", ",")} placeholder="250,00" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`expense-date-${expense.id}`}>Data</Label>
                      <Input id={`expense-date-${expense.id}`} name="expense_date" required type="date" defaultValue={expense.expenseDate} />
                    </div>
                  </div>
                  <div className="mt-3 space-y-2">
                    <Label htmlFor={`notes-${expense.id}`}>Observação</Label>
                    <Input id={`notes-${expense.id}`} name="notes" defaultValue={expense.notes ?? ""} placeholder="Ex.: referente a junho" />
                  </div>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <Button type="submit" variant="outline">
                      <Pencil className="h-4 w-4" />
                      Salvar
                    </Button>
                    <ConfirmActionButton
                      formAction={deleteBusinessExpenseAction}
                      variant="outline"
                      tone="danger"
                      title="Excluir despesa?"
                      description={`O lançamento "${expense.description}" será removido do financeiro.`}
                      confirmLabel="Excluir"
                      successTitle="Despesa excluída"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </ConfirmActionButton>
                  </div>
                </form>
              </details>
            ))
          )}
        </SectionCard>
      </div>
    </div>
  );
}

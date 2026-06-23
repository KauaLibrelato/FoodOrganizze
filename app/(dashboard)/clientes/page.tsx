import Link from "next/link";
import { Pencil, Search, Users } from "lucide-react";
import { createCustomerAction } from "@/app/actions";
import { PageTitle } from "@/components/dashboard/page-title";
import { SectionCard } from "@/components/cards/section-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CustomerEditor } from "@/components/forms/customer-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { getCustomers, getOrders } from "@/lib/data";

type CustomersPageProps = {
  searchParams?: Promise<{
    cliente?: string;
  }>;
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  const [customers, orders] = await Promise.all([getCustomers(), getOrders()]);
  const selectedCustomer = customers.find((customer) => customer.id === params?.cliente);

  return (
    <div className="space-y-6">
      <PageTitle
        title="Clientes"
        description="Guarde contatos, observações e o histórico simples de pedidos de cada cliente."
      />
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome, telefone ou observação" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_0.85fr]">
        <SectionCard title="Clientes cadastrados" description="Contatos e histórico simples de encomendas.">
          {customers.length === 0 ? (
            <EmptyState
              title="Nenhum cliente ainda"
              description="Cadastre clientes para acelerar novos pedidos e manter combinados por perto."
              icon={<Users className="h-9 w-9" />}
            />
          ) : (
            <div className="space-y-3">
              {customers.map((customer) => {
                const customerOrders = orders.filter((order) => order.customerId === customer.id);
                const isSelected = customer.id === selectedCustomer?.id;

                return (
                  <Link
                    key={customer.id}
                    href={`/clientes?cliente=${customer.id}`}
                    className={cn(
                      "brand-focus block rounded-2xl border border-cream-300 bg-cream-50/70 p-4 transition-colors hover:border-blush-200 hover:bg-blush-50/70",
                      isSelected && "border-blush-300 bg-blush-50 shadow-sm",
                    )}
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-semibold text-cocoa-800">{customer.name}</h2>
                          {isSelected ? <Pencil className="h-4 w-4 text-brand-700" /> : null}
                        </div>
                        <p className="mt-1 text-sm text-cocoa-500">{customer.phone ?? "Sem telefone"}</p>
                        {customer.address ? (
                          <p className="mt-1 text-sm text-cocoa-500">{customer.address}</p>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-blush-50 px-3 py-1 text-xs font-semibold text-brand-700">
                        {customerOrders.length} pedido(s)
                      </span>
                    </div>
                    {customer.notes ? (
                      <p className="mt-3 text-sm leading-6 text-cocoa-500">{customer.notes}</p>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          )}
        </SectionCard>
        <SectionCard
          title={selectedCustomer ? "Editar cliente" : "Novo cliente"}
          description={
            selectedCustomer
              ? "Atualize os dados do atendimento ou remova o cadastro."
              : "Guarde os dados que ajudam no próximo atendimento."
          }
        >
          {selectedCustomer ? (
            <CustomerEditor customer={selectedCustomer} />
          ) : (
            <form action={createCustomerAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" name="name" required placeholder="Ex.: Marina Alves" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" placeholder="(11) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input id="address" name="address" placeholder="Rua, número, bairro" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Input id="notes" name="notes" placeholder="Preferências, restrições, combinados" />
              </div>
              <Button className="w-full" type="submit">
                Cadastrar cliente
              </Button>
            </form>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

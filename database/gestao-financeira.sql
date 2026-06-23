-- Ajuste pontual para a aba Gestao.
-- Rode este arquivo no SQL Editor do Supabase se o banco ja estiver populado.
-- Nao precisa rodar o database/schema.sql inteiro so por causa desta feature.

create table if not exists public.business_expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  description text not null,
  category text not null,
  amount numeric(12, 2) not null check (amount >= 0),
  expense_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id)
);

create table if not exists public.profit_distribution_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  partners_percentage numeric(5, 2) not null default 30 check (partners_percentage >= 0),
  reinvestment_percentage numeric(5, 2) not null default 50 check (reinvestment_percentage >= 0),
  cash_reserve_percentage numeric(5, 2) not null default 20 check (cash_reserve_percentage >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id),
  check ((partners_percentage + reinvestment_percentage + cash_reserve_percentage) = 100)
);

create index if not exists business_expenses_business_id_idx
on public.business_expenses(business_id);

create index if not exists business_expenses_expense_date_idx
on public.business_expenses(expense_date);

create index if not exists profit_distribution_settings_business_id_idx
on public.profit_distribution_settings(business_id);

drop trigger if exists set_business_expenses_updated_at on public.business_expenses;
create trigger set_business_expenses_updated_at before update on public.business_expenses
for each row execute function public.set_updated_at();

drop trigger if exists set_profit_distribution_settings_updated_at on public.profit_distribution_settings;
create trigger set_profit_distribution_settings_updated_at before update on public.profit_distribution_settings
for each row execute function public.set_updated_at();

alter table public.business_expenses enable row level security;
alter table public.profit_distribution_settings enable row level security;

drop policy if exists "Users can manage expenses from own businesses" on public.business_expenses;
create policy "Users can manage expenses from own businesses" on public.business_expenses
for all using (public.user_can_access_business(business_id))
with check (public.user_can_access_business(business_id));

drop policy if exists "Users can manage profit distribution from own businesses" on public.profit_distribution_settings;
create policy "Users can manage profit distribution from own businesses" on public.profit_distribution_settings
for all using (public.user_can_access_business(business_id))
with check (public.user_can_access_business(business_id));

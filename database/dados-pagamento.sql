-- Ajuste pontual para dados de pagamento nos orcamentos.
-- Rode este arquivo no SQL Editor do Supabase se o banco ja estiver populado.
-- Nao rode o database/schema.sql inteiro so por causa desta feature.

create table if not exists public.business_payment_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  pix_key text,
  pix_holder_name text,
  bank_name text,
  payment_link text,
  payment_instructions text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id)
);

create index if not exists business_payment_settings_business_id_idx
on public.business_payment_settings(business_id);

drop trigger if exists set_business_payment_settings_updated_at on public.business_payment_settings;
create trigger set_business_payment_settings_updated_at before update on public.business_payment_settings
for each row execute function public.set_updated_at();

alter table public.business_payment_settings enable row level security;

drop policy if exists "Users can manage payment settings from own businesses" on public.business_payment_settings;
create policy "Users can manage payment settings from own businesses" on public.business_payment_settings
for all using (public.user_can_access_business(business_id))
with check (public.user_can_access_business(business_id));

create extension if not exists "pgcrypto";

do $$
begin
  create type public.unit_type as enum ('g', 'kg', 'ml', 'l', 'un');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.order_status as enum ('novo', 'confirmado', 'em_producao', 'pronto', 'entregue', 'cancelado');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_status as enum ('pendente', 'sinal_pago', 'pago', 'atrasado', 'cancelado');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.payment_method as enum ('dinheiro', 'pix', 'credito', 'debito', 'transferencia', 'outro');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id)
);

create table if not exists public.ingredients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  category text,
  base_unit public.unit_type not null,
  current_stock numeric(12, 3) not null default 0 check (current_stock >= 0),
  average_cost numeric(12, 4) not null default 0 check (average_cost >= 0),
  minimum_stock numeric(12, 3) not null default 0 check (minimum_stock >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id)
);

create table if not exists public.ingredient_purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete cascade,
  quantity numeric(12, 3) not null check (quantity > 0),
  unit public.unit_type not null,
  converted_quantity numeric(12, 3) not null check (converted_quantity > 0),
  total_price numeric(12, 2) not null check (total_price >= 0),
  unit_price numeric(12, 4) generated always as (total_price / converted_quantity) stored,
  purchase_date date not null default current_date,
  supplier text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id),
  foreign key (ingredient_id, business_id) references public.ingredients(id, business_id) on delete cascade
);

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  yield_quantity numeric(12, 3) not null check (yield_quantity > 0),
  yield_unit public.unit_type not null,
  preparation_time_minutes integer check (preparation_time_minutes is null or preparation_time_minutes >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id)
);

create table if not exists public.recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  recipe_id uuid not null references public.recipes(id) on delete cascade,
  ingredient_id uuid not null references public.ingredients(id) on delete restrict,
  quantity numeric(12, 3) not null check (quantity > 0),
  unit public.unit_type not null,
  converted_quantity numeric(12, 3) not null check (converted_quantity > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id),
  foreign key (recipe_id, business_id) references public.recipes(id, business_id) on delete cascade,
  foreign key (ingredient_id, business_id) references public.ingredients(id, business_id) on delete restrict
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  recipe_id uuid references public.recipes(id) on delete set null,
  name text not null,
  description text,
  default_sale_price numeric(12, 2) not null default 0 check (default_sale_price >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id),
  foreign key (recipe_id, business_id) references public.recipes(id, business_id) on delete set null (recipe_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  order_number text not null,
  delivery_date date not null,
  delivery_time time,
  status public.order_status not null default 'novo',
  payment_status public.payment_status not null default 'pendente',
  payment_method public.payment_method,
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  discount numeric(12, 2) not null default 0 check (discount >= 0),
  delivery_fee numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  total_price numeric(12, 2) not null default 0 check (total_price >= 0),
  total_cost_snapshot numeric(12, 2) not null default 0 check (total_cost_snapshot >= 0),
  estimated_profit_snapshot numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, order_number),
  unique (id, business_id),
  foreign key (customer_id, business_id) references public.customers(id, business_id) on delete set null (customer_id)
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  recipe_id uuid references public.recipes(id) on delete set null,
  name text not null,
  quantity numeric(12, 3) not null check (quantity > 0),
  quantity_unit public.unit_type not null default 'un',
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  total_price numeric(12, 2) not null check (total_price >= 0),
  unit_cost_snapshot numeric(12, 2) not null default 0 check (unit_cost_snapshot >= 0),
  total_cost_snapshot numeric(12, 2) not null default 0 check (total_cost_snapshot >= 0),
  profit_snapshot numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, business_id),
  foreign key (order_id, business_id) references public.orders(id, business_id) on delete cascade,
  foreign key (product_id, business_id) references public.products(id, business_id) on delete set null (product_id),
  foreign key (recipe_id, business_id) references public.recipes(id, business_id) on delete set null (recipe_id)
);

create table if not exists public.pricing_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  default_profit_margin_percentage numeric(6, 2) not null default 40 check (default_profit_margin_percentage >= 0),
  default_labor_cost_per_hour numeric(12, 2) not null default 0 check (default_labor_cost_per_hour >= 0),
  default_energy_cost_percentage numeric(6, 2) not null default 0 check (default_energy_cost_percentage >= 0),
  default_packaging_cost numeric(12, 2) not null default 0 check (default_packaging_cost >= 0),
  card_fee_percentage numeric(6, 2) not null default 0 check (card_fee_percentage >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id)
);

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

create index if not exists customers_business_id_idx on public.customers(business_id);
create index if not exists ingredients_business_id_idx on public.ingredients(business_id);
create index if not exists ingredient_purchases_business_id_idx on public.ingredient_purchases(business_id);
create index if not exists ingredient_purchases_ingredient_id_idx on public.ingredient_purchases(ingredient_id);
create index if not exists recipes_business_id_idx on public.recipes(business_id);
create index if not exists recipe_ingredients_business_id_idx on public.recipe_ingredients(business_id);
create index if not exists recipe_ingredients_recipe_id_idx on public.recipe_ingredients(recipe_id);
create index if not exists recipe_ingredients_ingredient_id_idx on public.recipe_ingredients(ingredient_id);
create index if not exists products_business_id_idx on public.products(business_id);
create index if not exists products_recipe_id_idx on public.products(recipe_id);
create index if not exists orders_business_id_idx on public.orders(business_id);
create index if not exists orders_customer_id_idx on public.orders(customer_id);
create index if not exists orders_delivery_date_idx on public.orders(delivery_date);
create index if not exists order_items_business_id_idx on public.order_items(business_id);
create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists order_items_recipe_id_idx on public.order_items(recipe_id);
create index if not exists pricing_settings_business_id_idx on public.pricing_settings(business_id);
create index if not exists business_expenses_business_id_idx on public.business_expenses(business_id);
create index if not exists business_expenses_expense_date_idx on public.business_expenses(expense_date);
create index if not exists profit_distribution_settings_business_id_idx on public.profit_distribution_settings(business_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_customers_updated_at on public.customers;
create trigger set_customers_updated_at before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_businesses_updated_at on public.businesses;
create trigger set_businesses_updated_at before update on public.businesses
for each row execute function public.set_updated_at();

drop trigger if exists set_ingredients_updated_at on public.ingredients;
create trigger set_ingredients_updated_at before update on public.ingredients
for each row execute function public.set_updated_at();

drop trigger if exists set_ingredient_purchases_updated_at on public.ingredient_purchases;
create trigger set_ingredient_purchases_updated_at before update on public.ingredient_purchases
for each row execute function public.set_updated_at();

drop trigger if exists set_recipes_updated_at on public.recipes;
create trigger set_recipes_updated_at before update on public.recipes
for each row execute function public.set_updated_at();

drop trigger if exists set_recipe_ingredients_updated_at on public.recipe_ingredients;
create trigger set_recipe_ingredients_updated_at before update on public.recipe_ingredients
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists set_order_items_updated_at on public.order_items;
create trigger set_order_items_updated_at before update on public.order_items
for each row execute function public.set_updated_at();

drop trigger if exists set_pricing_settings_updated_at on public.pricing_settings;
create trigger set_pricing_settings_updated_at before update on public.pricing_settings
for each row execute function public.set_updated_at();

drop trigger if exists set_business_expenses_updated_at on public.business_expenses;
create trigger set_business_expenses_updated_at before update on public.business_expenses
for each row execute function public.set_updated_at();

drop trigger if exists set_profit_distribution_settings_updated_at on public.profit_distribution_settings;
create trigger set_profit_distribution_settings_updated_at before update on public.profit_distribution_settings
for each row execute function public.set_updated_at();

create or replace function public.user_can_access_business(target_business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  -- FoodOrganizze runs as a single-company app. Users are created manually in
  -- Supabase Auth, and every authenticated user works inside the same business.
  select exists (
    select 1
    from public.businesses
    where businesses.id = target_business_id
      and auth.uid() is not null
  );
$$;

create or replace function public.email_has_auth_user(target_email text)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from auth.users
    where lower(users.email) = lower(trim(target_email))
  );
$$;

create or replace function public.apply_ingredient_purchase_to_stock()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_stock numeric(12, 3);
  existing_average_cost numeric(12, 4);
  new_average_cost numeric(12, 4);
begin
  select current_stock, average_cost
  into existing_stock, existing_average_cost
  from public.ingredients
  where id = new.ingredient_id
  for update;

  new_average_cost :=
    ((existing_stock * existing_average_cost) + new.total_price)
    / nullif(existing_stock + new.converted_quantity, 0);

  update public.ingredients
  set
    current_stock = existing_stock + new.converted_quantity,
    average_cost = coalesce(new_average_cost, new.total_price / new.converted_quantity),
    updated_at = now()
  where id = new.ingredient_id;

  return new;
end;
$$;

drop trigger if exists apply_ingredient_purchase_to_stock_after_insert on public.ingredient_purchases;
create trigger apply_ingredient_purchase_to_stock_after_insert
after insert on public.ingredient_purchases
for each row execute function public.apply_ingredient_purchase_to_stock();

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.customers enable row level security;
alter table public.ingredients enable row level security;
alter table public.ingredient_purchases enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.pricing_settings enable row level security;
alter table public.business_expenses enable row level security;
alter table public.profit_distribution_settings enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile" on public.profiles
for select using (id = auth.uid());

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile" on public.profiles
for insert with check (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "Users can manage own businesses" on public.businesses;
create policy "Users can manage own businesses" on public.businesses
for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists "Users can manage customers from own businesses" on public.customers;
create policy "Users can manage customers from own businesses" on public.customers
for all using (public.user_can_access_business(business_id))
with check (public.user_can_access_business(business_id));

drop policy if exists "Users can manage ingredients from own businesses" on public.ingredients;
create policy "Users can manage ingredients from own businesses" on public.ingredients
for all using (public.user_can_access_business(business_id))
with check (public.user_can_access_business(business_id));

drop policy if exists "Users can manage purchases from own businesses" on public.ingredient_purchases;
create policy "Users can manage purchases from own businesses" on public.ingredient_purchases
for all using (public.user_can_access_business(business_id))
with check (public.user_can_access_business(business_id));

drop policy if exists "Users can manage recipes from own businesses" on public.recipes;
create policy "Users can manage recipes from own businesses" on public.recipes
for all using (public.user_can_access_business(business_id))
with check (public.user_can_access_business(business_id));

drop policy if exists "Users can manage recipe ingredients from own businesses" on public.recipe_ingredients;
create policy "Users can manage recipe ingredients from own businesses" on public.recipe_ingredients
for all using (public.user_can_access_business(business_id))
with check (public.user_can_access_business(business_id));

drop policy if exists "Users can manage products from own businesses" on public.products;
create policy "Users can manage products from own businesses" on public.products
for all using (public.user_can_access_business(business_id))
with check (public.user_can_access_business(business_id));

drop policy if exists "Users can manage orders from own businesses" on public.orders;
create policy "Users can manage orders from own businesses" on public.orders
for all using (public.user_can_access_business(business_id))
with check (public.user_can_access_business(business_id));

drop policy if exists "Users can manage order items from own businesses" on public.order_items;
create policy "Users can manage order items from own businesses" on public.order_items
for all using (public.user_can_access_business(business_id))
with check (public.user_can_access_business(business_id));

drop policy if exists "Users can manage pricing settings from own businesses" on public.pricing_settings;
create policy "Users can manage pricing settings from own businesses" on public.pricing_settings
for all using (public.user_can_access_business(business_id))
with check (public.user_can_access_business(business_id));

drop policy if exists "Users can manage expenses from own businesses" on public.business_expenses;
create policy "Users can manage expenses from own businesses" on public.business_expenses
for all using (public.user_can_access_business(business_id))
with check (public.user_can_access_business(business_id));

drop policy if exists "Users can manage profit distribution from own businesses" on public.profit_distribution_settings;
create policy "Users can manage profit distribution from own businesses" on public.profit_distribution_settings
for all using (public.user_can_access_business(business_id))
with check (public.user_can_access_business(business_id));

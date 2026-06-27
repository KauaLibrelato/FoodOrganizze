-- Performance indexes for Casa Fratoni.
-- Apply manually in Supabase after reviewing on an isolated/staging database.
-- Rollback, if needed:
--   drop index if exists public.orders_business_delivery_date_idx;
--   drop index if exists public.orders_business_status_delivery_date_idx;
--   drop index if exists public.order_items_business_order_id_idx;
--   drop index if exists public.business_expenses_business_expense_date_idx;

create index if not exists orders_business_delivery_date_idx
on public.orders (business_id, delivery_date);

create index if not exists orders_business_status_delivery_date_idx
on public.orders (business_id, status, delivery_date);

create index if not exists order_items_business_order_id_idx
on public.order_items (business_id, order_id);

create index if not exists business_expenses_business_expense_date_idx
on public.business_expenses (business_id, expense_date);

-- Ajuste pontual para pedidos com multiplos itens e unidade por quantidade.
-- Use este arquivo em bancos ja populados em vez de rodar o schema inteiro.

alter table public.order_items
  add column if not exists quantity_unit public.unit_type not null default 'un';

update public.order_items
set quantity_unit = 'un'
where quantity_unit is null;

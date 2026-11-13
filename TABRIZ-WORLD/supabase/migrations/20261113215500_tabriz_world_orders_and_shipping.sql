-- TABRIZ WORLD: real buyer orders, seller order visibility and shipping tracking.
create sequence if not exists public.tw_order_number_seq;

create table if not exists public.tw_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  buyer_id uuid not null references auth.users(id) on delete restrict,
  seller_id uuid not null references auth.users(id) on delete restrict,
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 120),
  customer_phone text not null check (char_length(btrim(customer_phone)) between 8 and 20),
  delivery_address text not null check (char_length(btrim(delivery_address)) between 8 and 700),
  city text not null default 'تبریز',
  subtotal_toman bigint not null check (subtotal_toman > 0),
  shipping_fee_toman bigint not null default 0 check (shipping_fee_toman >= 0),
  total_toman bigint not null check (total_toman > 0),
  status text not null default 'awaiting_payment' check (status in ('awaiting_payment','confirmed','preparing','shipped','delivered','cancelled')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','paid','failed','refunded')),
  payment_provider text,
  payment_reference text,
  tracking_code text,
  seller_note text not null default '' check (char_length(seller_note) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tw_orders_total_matches check (total_toman = subtotal_toman + shipping_fee_toman)
);

create table if not exists public.tw_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.tw_orders(id) on delete cascade,
  product_id uuid references public.tw_products(id) on delete set null,
  product_name text not null,
  unit_price_toman bigint not null check (unit_price_toman > 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total_toman bigint not null check (line_total_toman = unit_price_toman * quantity),
  created_at timestamptz not null default now()
);

create index if not exists tw_orders_buyer_created_idx on public.tw_orders(buyer_id, created_at desc);
create index if not exists tw_orders_seller_created_idx on public.tw_orders(seller_id, created_at desc);
create index if not exists tw_order_items_order_idx on public.tw_order_items(order_id);
alter table public.tw_orders enable row level security;
alter table public.tw_order_items enable row level security;

drop policy if exists "TW buyers and sellers can read their orders" on public.tw_orders;
create policy "TW buyers and sellers can read their orders" on public.tw_orders for select to authenticated
using ((select auth.uid()) = buyer_id or (select auth.uid()) = seller_id);
drop policy if exists "TW participants can read order items" on public.tw_order_items;
create policy "TW participants can read order items" on public.tw_order_items for select to authenticated
using (exists (select 1 from public.tw_orders o where o.id = tw_order_items.order_id
  and ((select auth.uid()) = o.buyer_id or (select auth.uid()) = o.seller_id)));

revoke all on public.tw_orders from anon, authenticated;
revoke all on public.tw_order_items from anon, authenticated;
grant select on public.tw_orders, public.tw_order_items to authenticated;

create or replace function public.tw_place_order(p_items jsonb,p_customer_name text,p_customer_phone text,p_delivery_address text)
returns table(order_id uuid,order_number text)
language plpgsql security definer set search_path = public, auth
as $$
declare
  v_buyer uuid := auth.uid(); v_seller uuid; v_product public.tw_products%rowtype;
  v_item jsonb; v_product_id uuid; v_quantity integer; v_subtotal bigint := 0;
  v_order_id uuid; v_order_number text; v_count integer := 0;
begin
  if v_buyer is null then raise exception 'برای ثبت سفارش ابتدا وارد حساب شوید'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 30 then raise exception 'سبد خرید معتبر نیست'; end if;
  if char_length(btrim(coalesce(p_customer_name,''))) < 2 or char_length(btrim(p_customer_name)) > 120 then raise exception 'نام گیرنده معتبر نیست'; end if;
  if char_length(btrim(coalesce(p_customer_phone,''))) < 8 or char_length(btrim(p_customer_phone)) > 20 then raise exception 'شماره تماس معتبر نیست'; end if;
  if char_length(btrim(coalesce(p_delivery_address,''))) < 8 or char_length(btrim(p_delivery_address)) > 700 then raise exception 'نشانی تحویل معتبر نیست'; end if;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_product_id := (v_item->>'product_id')::uuid; v_quantity := (v_item->>'quantity')::integer;
    if v_quantity < 1 or v_quantity > 99 then raise exception 'تعداد کالا معتبر نیست'; end if;
    select * into v_product from public.tw_products where id=v_product_id and status='approved' for update;
    if not found then raise exception 'یکی از کالاها دیگر در دسترس نیست'; end if;
    if v_product.stock < v_quantity then raise exception 'موجودی کالای % کافی نیست',v_product.name; end if;
    if v_seller is null then v_seller:=v_product.seller_id; elsif v_seller<>v_product.seller_id then raise exception 'برای هر فروشنده باید سفارش جداگانه ثبت شود'; end if;
    v_subtotal:=v_subtotal+(v_product.price_toman*v_quantity); v_count:=v_count+1;
  end loop;
  if v_count<>jsonb_array_length(p_items) then raise exception 'اقلام سفارش معتبر نیستند'; end if;
  v_order_number:='TW-'||to_char(now() at time zone 'Asia/Tehran','YYMMDD')||'-'||lpad(nextval('public.tw_order_number_seq')::text,6,'0');
  insert into public.tw_orders(order_number,buyer_id,seller_id,customer_name,customer_phone,delivery_address,city,subtotal_toman,shipping_fee_toman,total_toman,status,payment_status)
  values(v_order_number,v_buyer,v_seller,btrim(p_customer_name),btrim(p_customer_phone),btrim(p_delivery_address),'تبریز',v_subtotal,0,v_subtotal,'awaiting_payment','unpaid')
  returning id into v_order_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    v_product_id:=(v_item->>'product_id')::uuid; v_quantity:=(v_item->>'quantity')::integer;
    select * into v_product from public.tw_products where id=v_product_id;
    insert into public.tw_order_items(order_id,product_id,product_name,unit_price_toman,quantity,line_total_toman)
    values(v_order_id,v_product.id,v_product.name,v_product.price_toman,v_quantity,v_product.price_toman*v_quantity);
    update public.tw_products set stock=stock-v_quantity,updated_at=now() where id=v_product_id and seller_id=v_seller;
  end loop;
  return query select v_order_id,v_order_number;
end; $$;

create or replace function public.tw_seller_update_order(p_order_id uuid,p_new_status text,p_tracking_code text default null,p_seller_note text default null)
returns boolean language plpgsql security definer set search_path=public,auth
as $$
declare v_order public.tw_orders%rowtype;
begin
  if auth.uid() is null then raise exception 'ابتدا وارد حساب شوید'; end if;
  select * into v_order from public.tw_orders where id=p_order_id and seller_id=auth.uid() for update;
  if not found then raise exception 'سفارش پیدا نشد'; end if;
  if v_order.payment_status<>'paid' then raise exception 'تا زمان تأیید پرداخت، آماده‌سازی و ارسال سفارش فعال نمی‌شود'; end if;
  if p_new_status not in ('preparing','shipped','delivered') then raise exception 'وضعیت انتخاب‌شده مجاز نیست'; end if;
  if p_new_status='shipped' and char_length(btrim(coalesce(p_tracking_code,'')))<4 then raise exception 'برای ثبت ارسال، کد رهگیری معتبر وارد کنید'; end if;
  if p_new_status='preparing' and v_order.status not in ('confirmed','preparing') then raise exception 'ابتدا سفارش باید تأیید شود';
  elsif p_new_status='shipped' and v_order.status not in ('preparing','shipped') then raise exception 'سفارش هنوز آماده ارسال نشده است';
  elsif p_new_status='delivered' and v_order.status<>'shipped' then raise exception 'فقط سفارش ارسال‌شده قابل ثبت به‌عنوان تحویل‌شده است'; end if;
  update public.tw_orders set status=p_new_status,
    tracking_code=case when p_new_status='shipped' then btrim(p_tracking_code) else tracking_code end,
    seller_note=coalesce(left(p_seller_note,1000),seller_note),updated_at=now()
  where id=p_order_id;
  return true;
end; $$;

revoke all on function public.tw_place_order(jsonb,text,text,text) from public,anon;
grant execute on function public.tw_place_order(jsonb,text,text,text) to authenticated;
revoke all on function public.tw_seller_update_order(uuid,text,text,text) from public,anon;
grant execute on function public.tw_seller_update_order(uuid,text,text,text) to authenticated;

-- ID Generator Function (Postgres)
create or replace function gen_id(prefix text, digits int)
returns text as $$
declare
  result text := prefix;
begin
  for i in 1..digits loop
    result := result || floor(random()*10)::int;
  end loop;
  return result;
end;
$$ language plpgsql;


-- TABLES
create table if not exists auth_users (
  id text primary key default gen_id('TLC-', 6),
  email text unique not null,
  store_name text,
  role text,
  status text default 'active',
  created_at timestamp with time zone default now()
);

create table if not exists store (
  id text primary key default gen_id('STR-', 4),
  name text,
  address text,
  created_at timestamp with time zone default now()
);

create table if not exists customers (
  id text primary key default gen_id('LC-', 8),
  name text,
  phone text,
  email text,
  street text,
  town text,
  district text,
  state text,
  created_at timestamp with time zone default now(),
  name_alias text,
  no_of_orders int default 0,
  total_spent numeric default 0,
  last_purchase_date timestamp with time zone
);

create table if not exists products_category (
  id text primary key default gen_id('PC-', 4),
  category_name text,
  store_id text references store(id)
);

create table if not exists products_list (
  id text primary key default gen_id('PL-', 6),
  store_id text references store(id),
  name text,
  category_id text references products_category(id),
  price numeric,
  stock int,
  sales int,
  created_at timestamp with time zone default now(),
  item_detail text,
  hsn_code text
);

create table if not exists orders (
  id text primary key default gen_id('OD-', 6),
  customer_id text references customers(id),
  status text,
  store_location text,
  created_at timestamp with time zone default now(),
  total_discount numeric,
  advance_paid numeric,
  balance_due numeric,
  order_date timestamp with time zone default now(),
  discount_amt numeric,
  discount_rate numeric,
  taxable_amount numeric,
  cgst_amt numeric,
  sgst_amt numeric,
  due_amount numeric,
  subtotal numeric,
  gross_amount numeric,
  voucher_no text
);

create table if not exists voucher (
  id text primary key default gen_id('VC-', 8),
  voucher_no text unique,
  order_id text references orders(id),
  created_at timestamp with time zone default now()
);

create table if not exists order_items (
  id text primary key default gen_id('OL-', 8),
  order_id text references orders(id) on delete cascade,
  product_id text references products_list(id),
  qty int,
  price numeric,
  discount_amt numeric,
  taxable_amount numeric,
  cgst_amt numeric,
  sgst_amt numeric,
  total_price numeric
);

-- INDEXES (REQUIRED)
create index if not exists idx_orders_customer on orders(customer_id);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_products_store on products_list(store_id);

-- ROW LEVEL SECURITY (RLS)
alter table auth_users enable row level security;
alter table store enable row level security;
alter table voucher enable row level security;
alter table customers enable row level security;
alter table products_category enable row level security;
alter table products_list enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

-- BASIC POLICY (STARTER)
create policy "allow_all_authenticated" on auth_users for all using (auth.role() = 'authenticated');
create policy "allow_all_authenticated" on store for all using (auth.role() = 'authenticated');
create policy "allow_all_authenticated" on voucher for all using (auth.role() = 'authenticated');
create policy "allow_all_authenticated" on customers for all using (auth.role() = 'authenticated');
create policy "allow_all_authenticated" on products_category for all using (auth.role() = 'authenticated');
create policy "allow_all_authenticated" on products_list for all using (auth.role() = 'authenticated');
create policy "allow_all_authenticated" on orders for all using (auth.role() = 'authenticated');
create policy "allow_all_authenticated" on order_items for all using (auth.role() = 'authenticated');


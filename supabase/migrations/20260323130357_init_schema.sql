-- Drivers
create table if not exists drivers (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null,
  phone           text,
  truck_plate     text,
  expo_push_token text
);

-- Orders
create table if not exists orders (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz default now(),
  pickup_address   text not null,
  delivery_address text not null,
  goods_desc       text,
  weight_tons      float,
  notes            text,
  status           text not null default 'pending'
    check (status in ('pending','assigned','picked_up','in_transit','delivered')),
  driver_id        uuid references drivers(id) on delete set null
);

-- Enable Realtime on orders
alter publication supabase_realtime add table orders;

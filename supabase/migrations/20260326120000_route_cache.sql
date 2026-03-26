-- Route cache: persist computed HERE truck routes by rounded lat/lon pair.
-- Coordinates are rounded to 4 decimal places (~11 m precision) so that
-- any two orders sharing the same geocoded pickup/delivery reuse the route.
create table if not exists route_cache (
  id          uuid primary key default gen_random_uuid(),
  origin_lat  float8  not null,
  origin_lon  float8  not null,
  dest_lat    float8  not null,
  dest_lon    float8  not null,
  distance_m  integer not null,
  duration_s  integer not null,
  -- Decoded polyline stored as [{lat, lon}] JSONB array
  polyline    jsonb   not null,
  created_at  timestamptz default now(),

  -- Unique key: one cached route per coordinate pair
  constraint uq_route_cache unique (origin_lat, origin_lon, dest_lat, dest_lon)
);

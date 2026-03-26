-- Phase 2 schema extensions
-- Run this in the Supabase SQL editor.
-- All changes are backwards-compatible: existing rows are unaffected.

-- 1. Driver availability toggle
--    Defaults to true so all existing drivers remain available after the migration.
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_available boolean NOT NULL DEFAULT true;

-- 2. Delivery proof photo URL (stored in Supabase Storage bucket "delivery-proofs")
ALTER TABLE orders ADD COLUMN IF NOT EXISTS proof_photo_url text;

-- 3. Order history
--    No schema change required — history is simply orders WHERE status = 'delivered'.

-- 4. Driver locations table (for live GPS tracking, Step 15)
CREATE TABLE IF NOT EXISTS driver_locations (
  driver_id   uuid PRIMARY KEY REFERENCES drivers(id) ON DELETE CASCADE,
  lat         float NOT NULL,
  lon         float NOT NULL,
  heading     float,
  updated_at  timestamptz DEFAULT now()
);

-- Enable Realtime on driver_locations so the admin map (Step 16) receives live updates.
-- NOTE: also toggle Realtime ON for this table in the Supabase dashboard →
--       Table Editor → driver_locations → Realtime.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;
EXCEPTION
  WHEN duplicate_object THEN NULL; -- already a member, nothing to do
END;
$$;

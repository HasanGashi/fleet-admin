-- Create the delivery-proofs Storage bucket (public read, so proof photo URLs work without auth)
INSERT INTO storage.buckets (id, name, public)
VALUES ('delivery-proofs', 'delivery-proofs', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to read proof photos (public bucket policy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Public read delivery proofs'
  ) THEN
    CREATE POLICY "Public read delivery proofs"
      ON storage.objects FOR SELECT
      USING (bucket_id = 'delivery-proofs');
  END IF;
END $$;

-- Allow anon writes (driver app uses the anon key; adjust to service_role if you add auth later)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Anon upload delivery proofs'
  ) THEN
    CREATE POLICY "Anon upload delivery proofs"
      ON storage.objects FOR INSERT
      WITH CHECK (bucket_id = 'delivery-proofs');
  END IF;
END $$;

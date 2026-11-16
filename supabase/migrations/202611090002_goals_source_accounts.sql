ALTER TABLE goals ADD COLUMN IF NOT EXISTS source_account_ids uuid[] NOT NULL DEFAULT '{}';
UPDATE goals SET source_account_ids = ARRAY[source_account_id]
WHERE source_account_id IS NOT NULL AND source_account_ids = '{}';

-- Особиста нотатка до операції («що купила»), окремо від назви мерчанта/опису банку (note)
alter table public.transactions add column if not exists comment text;

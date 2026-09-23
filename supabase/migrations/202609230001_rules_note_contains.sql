-- Дозволяємо правило «Назва містить» (note_contains): його використовують
-- авто-запам'ятовування категорій і «Звідки приходить платіж» у категоріях доходу.
alter table public.transaction_rules drop constraint if exists transaction_rules_condition_type_check;
alter table public.transaction_rules add constraint transaction_rules_condition_type_check
  check (condition_type = any (array['amount_gt', 'amount_lt', 'no_category', 'currency_is', 'note_contains']));

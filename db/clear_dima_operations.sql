-- Видалення ВСІХ операцій і переказів по рахунках Діми (баланси рахунків НЕ змінюються).
-- Supabase → SQL Editor. Спочатку запусти КРОК 1 і перевір, що це саме рахунки Діми.

-- КРОК 1: перевірка
select a.id, a.name, a.owner_label,
       (select count(*) from transactions t where t.account_id = a.id) as tx_count,
       (select count(*) from transfers tr where tr.from_account_id = a.id or tr.to_account_id = a.id) as transfers_count
from accounts a
where a.owner_label ilike '%діма%' or a.owner_label ilike '%дима%' or a.owner_label ilike '%dima%'
order by a.name;

-- КРОК 2: видалення (одна транзакція; transfers першими через FK на transactions)
begin;

create temp table _dima_acc on commit drop as
  select id from accounts
  where owner_label ilike '%діма%' or owner_label ilike '%дима%' or owner_label ilike '%dima%';

delete from transfers
 where from_account_id in (select id from _dima_acc)
    or to_account_id   in (select id from _dima_acc);

-- transaction_splits і transaction_tags видаляються каскадом
delete from transactions
 where account_id in (select id from _dima_acc);

-- перевірка: має бути 0 / 0
select (select count(*) from transactions where account_id in (select id from _dima_acc)) as tx_left,
       (select count(*) from transfers where from_account_id in (select id from _dima_acc) or to_account_id in (select id from _dima_acc)) as transfers_left;

commit;  -- якщо щось не так: замість commit виконай rollback;

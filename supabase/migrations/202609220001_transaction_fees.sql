-- Комісії: окреме поле в операції + сума з чека в іншій валюті.
-- fee_amount завжди в UAH (різниця з курсом НБУ на дату операції + комісія банку).
-- original_amount / original_currency — фактична сума з чека (напр. 1000 UAH при оплаті з доларової картки).
alter table public.transactions
  add column if not exists fee_amount numeric(14,2),
  add column if not exists original_amount numeric(14,2),
  add column if not exists original_currency text;

comment on column public.transactions.fee_amount is 'Комісія в UAH (різниця з курсом НБУ + комісія банку)';
comment on column public.transactions.original_amount is 'Сума з чека у валюті операції';
comment on column public.transactions.original_currency is 'Валюта операції (з чека)';

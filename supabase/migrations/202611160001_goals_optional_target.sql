-- Цільова сума банки стає необов'язковою
alter table public.goals alter column target_amount drop not null;
alter table public.goals drop constraint if exists goals_target_amount_check;
alter table public.goals add constraint goals_target_amount_check check (target_amount is null or target_amount > 0);

create or replace function public.contribute_to_goal(p_goal_id uuid, p_amount numeric)
returns public.goals language plpgsql set search_path = public
as $$
declare item public.goals;
begin
  if p_amount <= 0 then raise exception 'Amount must be positive'; end if;
  select * into item from public.goals where id=p_goal_id for update;
  if item.id is null or not public.is_household_member(item.household_id) then raise exception 'Goal not found or access denied'; end if;
  insert into public.goal_contributions(goal_id,amount,created_by) values(item.id,p_amount,(select auth.uid()));
  update public.goals set current_amount=current_amount+p_amount,
    completed=coalesce(current_amount+p_amount>=target_amount,false) where id=item.id returning * into item;
  return item;
end $$;

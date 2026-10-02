-- Keep the support audit row when the supported parent account is removed.
-- The target is already nullable; actor records remain protected separately.
alter table public.admin_actions
  drop constraint admin_actions_target_id_fkey,
  add constraint admin_actions_target_id_fkey
    foreign key (target_id) references auth.users(id) on delete set null;

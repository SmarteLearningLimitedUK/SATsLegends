-- OAuth does not carry our email-report preference at initial signup.
-- Default new social accounts to no reports until the parent opts in.
create or replace function public.create_parent_settings() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.parent_settings(parent_id, report_emails)
    values (new.id, coalesce((new.raw_user_meta_data->>'report_emails')::boolean, false));
  return new;
end;
$$;

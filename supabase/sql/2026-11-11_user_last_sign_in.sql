-- Lets admins see when each user last signed in (Settings → Users).
-- Sign-in times live in auth.users, which the app can't read directly, so this
-- function reads them on the admin's behalf. Anyone who isn't an active admin
-- gets no rows back.
create or replace function public.admin_user_sign_ins()
returns table (id uuid, last_sign_in_at timestamptz)
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id, u.last_sign_in_at
  from auth.users u
  where exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin' and coalesce(p.active, true)
  );
$$;

revoke all on function public.admin_user_sign_ins() from public, anon;
grant execute on function public.admin_user_sign_ins() to authenticated;

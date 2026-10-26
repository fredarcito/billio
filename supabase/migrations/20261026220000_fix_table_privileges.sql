-- Corrige los privilegios de las tablas de Billio.
-- El `revoke all` de la migración inicial quitó también los privilegios por defecto que
-- Supabase concede al rol `authenticated`, y el `grant` posterior no los recuperó del todo
-- (de ahí "permission denied for table invoices").
-- Aquí se concede explícitamente lo que necesita cada rol, sin tocar RLS.

-- anon: sin acceso (todo pasa por la sesión)
revoke all on public.profiles from anon;
revoke all on public.invoices from anon;

-- authenticated: lectura y escritura de sus propias filas (RLS decide cuáles)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;

-- service_role (cron): acceso total, salta RLS por diseño
grant usage on schema public to service_role;
grant all on public.profiles to service_role;
grant all on public.invoices to service_role;

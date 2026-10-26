-- El cron lee los perfiles con la clave secreta (rol `service_role`) porque no hay sesión.
-- Falla con "permission denied for table profiles" (42501) si el rol no tiene privilegios
-- sobre la tabla: pasa cuando el `revoke all` de la migración inicial se ejecutó después de
-- que Supabase concediera los suyos, o si el rol se recreó.
--
-- Se conceden los privilegios de forma explícita e idempotente. `service_role` salta RLS
-- por diseño (rolbypassrls), así que esto no abre acceso a nadie más.
grant usage on schema public to service_role;
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.invoices to service_role;

-- Los usuarios con sesión también necesitan poder leer/escribir sus propias filas (RLS decide cuáles)
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;

-- anon no debe tocar nada
revoke all on public.profiles from anon;
revoke all on public.invoices from anon;

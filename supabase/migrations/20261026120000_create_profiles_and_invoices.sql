-- Billio: perfil de facturación y facturas de cada cuenta.
-- Los usuarios viven en Supabase Auth (auth.users): el registro y el login los hace Supabase,
-- y aquí solo se guarda lo que es de la aplicación, con una fila por cuenta.
-- Igual que en Lowfly: RLS activado, políticas por dueño y privilegios explícitos.

-- Perfil: los datos que se repiten en cada factura (emisor, destinatario, importe, moneda, concepto).
create table public.profiles (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  issuer_name text not null,
  recipient_email text not null,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  description text not null,
  auto_send boolean not null default true,
  updated_at timestamptz not null default now()
);

-- Facturas emitidas. `year` + `month` únicos por cuenta: es la idempotencia del cron
-- (antes era un candado SET NX en KV; ahora lo garantiza la base de datos).
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  number text not null,
  year int not null check (year between 2000 and 2100),
  month int not null check (month between 1 and 12),
  issuer_name text not null,
  recipient_email text not null,
  amount numeric(12, 2) not null,
  currency text not null,
  description text not null,
  source text not null check (source in ('manual', 'cron')),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  resend_id text,
  error text,
  issued_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (user_id, year, month)
);

create index invoices_user_recent on public.invoices (user_id, issued_at desc);
create index profiles_auto_send on public.profiles (user_id) where auto_send;

alter table public.profiles enable row level security;
alter table public.invoices enable row level security;

create policy "Owners read their profile" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Owners add their profile" on public.profiles
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owners change their profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Owners read their invoices" on public.invoices
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Owners add their invoices" on public.invoices
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Owners delete their invoices" on public.invoices
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Solo personas con sesión llegan a estas tablas por la Data API, y RLS las limita a sus filas.
-- Los privilegios por defecto del proyecto lo conceden todo (TRUNCATE incluido, que salta RLS),
-- así que se retiran primero. Las facturas no se editan: se crean y, si el envío falla, se borran.
revoke all on public.profiles from anon, authenticated;
revoke all on public.invoices from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, delete on public.invoices to authenticated;

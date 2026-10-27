-- Facturación por horas.
--
-- Hasta ahora una factura era un único importe fijo (`invoices.amount`) con un solo concepto
-- (`invoices.description`). Con el modo "por horas" el importe cambia cada mes, así que:
--
--   1. El perfil elige el modo: 'fixed' (importe fijo, envío automático) u 'hourly' (por horas).
--   2. La factura pasa a tener líneas de concepto (`invoice_items`): cantidad × precio.
--   3. El envío automático en modo 'hourly' no puede emitir solo: crea un BORRADOR ('draft')
--      que la persona revisa y confirma.
--
-- Compatibilidad: `invoices.amount` sigue siendo el total y `invoices.description` el resumen
-- de conceptos, así que las facturas antiguas (sin líneas) se siguen viendo igual.

-- --- Perfil: modo de facturación y tarifa -----------------------------------

alter table public.profiles
  add column if not exists billing_mode text not null default 'fixed',
  add column if not exists hourly_rate numeric(12, 2),
  add column if not exists hourly_unit text not null default 'h';

alter table public.profiles drop constraint if exists profiles_billing_mode_check;
alter table public.profiles
  add constraint profiles_billing_mode_check check (billing_mode in ('fixed', 'hourly'));

-- En modo por horas la tarifa es obligatoria y positiva; en modo fijo no se usa.
alter table public.profiles drop constraint if exists profiles_hourly_rate_check;
alter table public.profiles
  add constraint profiles_hourly_rate_check
  check (billing_mode <> 'hourly' or (hourly_rate is not null and hourly_rate > 0));

-- --- Facturas: estado 'draft' y subtotal ------------------------------------

alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices
  add constraint invoices_status_check
  check (status in ('draft', 'pending', 'sent', 'failed', 'cancelled'));

alter table public.invoices
  add column if not exists subtotal numeric(12, 2);

-- --- Líneas de concepto -----------------------------------------------------

create table if not exists public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  position int not null default 0,
  description text not null,
  quantity numeric(12, 2) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  -- Importe de la línea, guardado para que el histórico no cambie si se edita la tarifa
  amount numeric(12, 2) not null check (amount >= 0)
);

create index if not exists invoice_items_invoice on public.invoice_items (invoice_id, position);

alter table public.invoice_items enable row level security;

-- Solo el dueño de la factura ve y toca sus líneas (se comprueba a través de la factura)
drop policy if exists "Owners read their invoice items" on public.invoice_items;
create policy "Owners read their invoice items" on public.invoice_items
  for select to authenticated
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id and i.user_id = (select auth.uid())
    )
  );

drop policy if exists "Owners add their invoice items" on public.invoice_items;
create policy "Owners add their invoice items" on public.invoice_items
  for insert to authenticated
  with check (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id and i.user_id = (select auth.uid())
    )
  );

drop policy if exists "Owners change their invoice items" on public.invoice_items;
create policy "Owners change their invoice items" on public.invoice_items
  for update to authenticated
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id and i.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id and i.user_id = (select auth.uid())
    )
  );

drop policy if exists "Owners delete their invoice items" on public.invoice_items;
create policy "Owners delete their invoice items" on public.invoice_items
  for delete to authenticated
  using (
    exists (
      select 1 from public.invoices i
      where i.id = invoice_id and i.user_id = (select auth.uid())
    )
  );

-- Privilegios explícitos (el `revoke all` inicial los quitó; ver 20261026220000)
revoke all on public.invoice_items from anon;
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.invoice_items to authenticated;
grant all on public.invoice_items to service_role;

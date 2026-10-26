-- Anulación de facturas: la factura no se borra (registro fiscal), se marca como anulada.
-- El periodo vuelve a quedar libre para emitir una nueva, así que el índice único
-- (user_id, year, month) solo aplica a las facturas que no están anuladas.
alter table public.invoices
  drop constraint if exists invoices_user_id_year_month_key;

alter table public.invoices
  add column cancelled_at timestamptz,
  add column cancel_reason text,
  add column replaces_id uuid references public.invoices (id) on delete set null;

-- Una sola factura vigente por periodo: las anuladas no cuentan
create unique index invoices_active_period
  on public.invoices (user_id, year, month)
  where cancelled_at is null;

-- Solo se puede anular (no modificar el resto de campos): el estado pasa a 'cancelled'
alter table public.invoices
  drop constraint if exists invoices_status_check;

alter table public.invoices
  add constraint invoices_status_check
  check (status in ('pending', 'sent', 'failed', 'cancelled'));

-- Nombre y datos fiscales del cliente al que se factura.
-- Antes solo se guardaba su email, pero una factura necesita el nombre de a quién se le cobra.
alter table public.profiles
  add column recipient_name text,
  add column recipient_tax_id text;

alter table public.invoices
  add column recipient_name text,
  add column recipient_tax_id text;

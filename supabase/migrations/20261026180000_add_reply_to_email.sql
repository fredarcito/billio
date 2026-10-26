-- Email al que van las respuestas de las facturas (Reply-To).
-- El From sigue siendo el dominio verificado en Resend; las respuestas llegan a la persona.
alter table public.profiles
  add column reply_to_email text check (reply_to_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$');

alter table public.invoices
  add column reply_to_email text;

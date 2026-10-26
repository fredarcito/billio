-- Día del mes en que se emite y envía la factura automática.
-- Por defecto el 1, que es el comportamiento anterior. Se limita a 1-28 para que
-- exista en todos los meses (incluido febrero).
alter table public.profiles
  add column if not exists send_day integer not null default 1;

alter table public.profiles
  drop constraint if exists profiles_send_day_check;

alter table public.profiles
  add constraint profiles_send_day_check check (send_day between 1 and 28);

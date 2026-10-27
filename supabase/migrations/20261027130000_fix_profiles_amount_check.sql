-- Facturación por horas: el importe fijo del perfil deja de ser obligatorio.
--
-- `profiles.amount` se creó con `check (amount > 0)`, porque antes toda cuenta facturaba un
-- importe fijo cada mes. Con el modo por horas ese importe no se usa (lo pone cada factura al
-- confirmar el borrador), así que guardarlo como 0 rompía el check y el perfil no se podía
-- guardar. Ahora se permite 0: en modo 'hourly' el importe es 0 y manda `hourly_rate`.

alter table public.profiles drop constraint if exists profiles_amount_check;
alter table public.profiles
  add constraint profiles_amount_check check (amount >= 0);

-- En modo fijo el importe sigue siendo obligatorio y positivo.
alter table public.profiles drop constraint if exists profiles_fixed_amount_check;
alter table public.profiles
  add constraint profiles_fixed_amount_check
  check (billing_mode <> 'fixed' or amount > 0);

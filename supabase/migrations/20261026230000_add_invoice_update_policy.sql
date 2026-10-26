-- Las facturas se insertan como 'pending' y, tras enviar el correo, se marcan como 'sent'
-- (o 'failed'). Faltaba la política de UPDATE: la migración de privilegios concedía
-- select/insert/delete, así que el UPDATE no devolvía filas y la factura se quedaba
-- en 'pending' aunque el correo se hubiera enviado.
create policy "Owners change their invoices" on public.invoices
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

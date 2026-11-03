-- Tipos de tarifa internos para regalar clases sin cobrar (no salen en el catálogo ni al asignar tarifas).
-- Los usa la ficha de cada persona, en «Añadir tarifa o regalo». No crean pagos ni facturas.
-- No borra ni cambia nada de lo que ya hay.

insert into public.tipos_bono (nombre, nombre_en, servicio, clases, validez_dias, precio_centimos, requiere_pago, activo, orden)
values
  ('Regalo · grupal', 'Gift · group', 'grupal', 1, 30, 0, false, false, 999),
  ('Regalo · individual', 'Gift · personal', 'individual', 1, 30, 0, false, false, 999),
  ('Regalo · online', 'Gift · online', 'online', 1, 30, 0, false, false, 999),
  ('Regalo · taller', 'Gift · workshop', 'taller', 1, 30, 0, false, false, 999)
on conflict (nombre) do nothing;

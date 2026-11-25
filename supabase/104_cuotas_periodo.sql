-- 104: cada cuota de un pago a plazos dice qué periodo cubre (desde qué día hasta qué día).
-- Pégalo ENTERO en el editor SQL de Supabase de CalisCoach y pulsa Run. Se puede repetir sin problema. No cambia ningún pago que ya exista.

alter table public.pagos
  add column if not exists cubre_desde date,
  add column if not exists cubre_hasta date;

notify pgrst, 'reload schema';

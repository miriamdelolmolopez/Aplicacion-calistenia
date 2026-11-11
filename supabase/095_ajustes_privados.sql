-- El código de las pruebas gratuitas no tiene por qué poder leerlo cualquier persona con sesión: solo la administradora.
-- (El resto de ajustes, como las horas de cancelación, sí los necesita leer la app de las alumnas.)
-- La app lee ese código con la clave de servicio, así que no se ve afectada.
drop policy if exists ajustes_ver on public.ajustes;
create policy ajustes_ver on public.ajustes
  for select to authenticated
  using (clave not in ('prueba_codigo', 'prueba_activa') or (select public.es_admin()));

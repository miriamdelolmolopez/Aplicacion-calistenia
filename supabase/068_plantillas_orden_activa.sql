-- Plantillas de horario: orden de aparición y si están activas.
--  · orden: posición en la lista (de menor a mayor).
--  · activa: una plantilla desactivada queda guardada, pero no sale al elegir plantilla para publicar clases.
-- No borra ni cambia nada de lo que ya hay.

alter table public.plantillas_horario
  add column if not exists orden int not null default 0,
  add column if not exists activa boolean not null default true;

-- Orden inicial: la principal primero y el resto por nombre, de 10 en 10.
update public.plantillas_horario p
set orden = o.n * 10
from (
  select id, row_number() over (order by principal desc, lower(nombre)) as n
  from public.plantillas_horario
) o
where o.id = p.id and p.orden = 0;

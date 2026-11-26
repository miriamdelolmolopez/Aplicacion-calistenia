-- Cada conexión de formulario puede llevar un «Tipo de lead» y unas «Etiquetas» por defecto: los leads que lleguen por ella se crean con ellos.
-- Pégalo entero en el editor SQL de Supabase y pulsa Run. Se puede ejecutar más de una vez sin problema. No borra ni cambia nada existente.
-- Necesita haber ejecutado antes el archivo 100 (Leads). No cambia las direcciones (claves) de las conexiones que ya existen.

alter table public.leads_conexiones add column if not exists tipo_id uuid references public.leads_tipos (id) on delete set null;
alter table public.leads_conexiones add column if not exists etiqueta_ids uuid[] not null default '{}';

-- La pantalla de conexiones lee estas columnas con la sesión del entrenador (solo ve las suyas, por la regla que ya existe).
grant select (tipo_id, etiqueta_ids) on public.leads_conexiones to authenticated;

notify pgrst, 'reload schema';

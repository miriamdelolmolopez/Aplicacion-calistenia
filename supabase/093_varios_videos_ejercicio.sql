-- Varios vídeos por ejercicio, cada uno con su nombre (por ejemplo «Vídeo corto», «Vídeo largo»).
-- Pegar entero en Supabase > SQL Editor > New query y pulsar Run. No borra nada.

alter table public.ejercicios add column if not exists videos jsonb not null default '[]'::jsonb;

-- El vídeo único de cada ejercicio pasa a ser el primero de la lista (se llama «Vídeo»; luego le puedes cambiar el nombre).
update public.ejercicios
set videos = jsonb_build_array(jsonb_build_object('nombre', 'Vídeo', 'url', video_url))
where video_url is not null and btrim(video_url) <> '' and videos = '[]'::jsonb;

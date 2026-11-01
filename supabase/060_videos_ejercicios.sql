-- Almacén de vídeos de los ejercicios: públicos para verlos, hasta 50 MB por archivo, solo MP4, WebM y MOV.
-- Solo se sube desde Administración (con un permiso temporal que da el servidor).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 52428800, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

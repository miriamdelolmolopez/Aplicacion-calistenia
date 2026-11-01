-- Varias fotos para Portada y Saludo de Inicio: las nuevas se guardan como «portada:…» e «inicio:…».
-- No cambia ni borra ninguna foto: solo ensancha la regla de qué nombres se aceptan.
alter table public.fotos_app drop constraint if exists fotos_app_clave_check;
alter table public.fotos_app add constraint fotos_app_clave_check
  check (clave ~ '^(portada|inicio)(:[a-z0-9]+)?$' or clave like 'card:%');

// Esta ruta reenviaba los vídeos de Google Drive pasando por nuestro servidor, y gastó la cuota de datos de Vercel (noviembre de 2026).
// Ya no se usa: los vídeos de Drive se ven con el reproductor de Drive, directamente desde Google.
// Se deja cerrada (410) para que ninguna app instalada con la versión antigua pueda volver a gastar datos.
export function GET() {
  return new Response("Este vídeo ya no se sirve desde aquí.", { status: 410, headers: { "Cache-Control": "public, max-age=86400" } });
}

// Los vídeos de los ejercicios son enlaces de YouTube o de Google Drive. Solo se aceptan
// estos dos sitios y se guarda un enlace "limpio", para que no se pueda incrustar
// cualquier dirección dentro de la app.
export type Video = {
  origen: "youtube" | "drive";
  embed: string; // dirección para mostrarlo dentro de la app
  enlace: string; // enlace limpio que se guarda
};

const ID_YOUTUBE = /^[\w-]{11}$/;
const ID_DRIVE = /^[\w-]{10,}$/;

export function analizarVideo(texto: string): Video | null {
  let url: URL;
  try {
    url = new URL(texto.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const host = url.hostname.replace(/^(www|m)\./, "");

  // YouTube: watch?v=ID, youtu.be/ID, /shorts/ID, /embed/ID, /live/ID
  let idYoutube: string | null = null;
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") {
      idYoutube = url.searchParams.get("v");
    } else {
      idYoutube = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/)?.[1] ?? null;
    }
  } else if (host === "youtu.be") {
    idYoutube = url.pathname.slice(1, 12);
  }
  if (idYoutube && ID_YOUTUBE.test(idYoutube)) {
    return {
      origen: "youtube",
      embed: `https://www.youtube-nocookie.com/embed/${idYoutube}?rel=0`,
      enlace: `https://youtu.be/${idYoutube}`,
    };
  }

  // Google Drive: /file/d/ID/view, open?id=ID, uc?id=ID
  if (host === "drive.google.com") {
    const idDrive =
      url.pathname.match(/^\/file\/d\/([\w-]{10,})/)?.[1] ??
      (url.pathname === "/open" || url.pathname === "/uc" ? url.searchParams.get("id") : null);
    if (idDrive && ID_DRIVE.test(idDrive)) {
      return {
        origen: "drive",
        embed: `https://drive.google.com/file/d/${idDrive}/preview`,
        enlace: `https://drive.google.com/file/d/${idDrive}/view`,
      };
    }
  }

  return null;
}

const MEDIA_ACCEPT = {
  accept: ".jpg,.jpeg,.png,.webp,.mp4,.mov",
  mime: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "video/quicktime",
  ],
};

const MUSIC_ACCEPT = {
  accept: ".mp3,.wav,.m4a",
  mime: [
    "audio/mpeg",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/x-m4a",
    "audio/m4a",
  ],
};

export function isAllowedMediaFile(file: File) {
  return MEDIA_ACCEPT.mime.includes(file.type);
}

export function isAllowedMusicFile(file: File) {
  return MUSIC_ACCEPT.mime.includes(file.type) || /\.(mp3|wav|m4a)$/i.test(file.name);
}

export async function fileToBase64(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function readAudioDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.addEventListener("loadedmetadata", () => {
      URL.revokeObjectURL(url);
      resolve(Math.round(audio.duration || 0));
    });
    audio.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      resolve(0);
    });
  });
}

export { MEDIA_ACCEPT, MUSIC_ACCEPT };

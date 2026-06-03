/** Best still to preview a video card (generated frame is often last in input_assets). */
export function pickVideoPosterUrl(inputUrls: string[]): string | undefined {
  const urls = inputUrls.filter(Boolean);
  if (urls.length === 0) return undefined;
  return urls[urls.length - 1] ?? urls[0];
}

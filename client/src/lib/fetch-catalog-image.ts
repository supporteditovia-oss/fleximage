/** Télécharge une image du catalogue (chemin public) pour l’upload ou la génération. */
export async function fetchCatalogImageAsFile(
  imagePath: string,
  filename: string,
): Promise<File> {
  const res = await fetch(imagePath);
  if (!res.ok) {
    throw new Error(`Impossible de charger l’image (${res.status})`);
  }
  const blob = await res.blob();
  const type = blob.type || "image/webp";
  return new File([blob], filename, { type });
}

export async function fetchCatalogImageAsBase64(
  imagePath: string,
): Promise<string> {
  const file = await fetchCatalogImageAsFile(imagePath, "catalog-ref.webp");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

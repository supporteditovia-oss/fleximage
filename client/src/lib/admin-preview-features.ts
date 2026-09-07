/** Modèles prêts, catalogue outfits, etc. — visible uniquement par les admins. */
export function canAccessAdminPreviewFeatures(
  isAdmin: boolean | undefined,
): boolean {
  return Boolean(isAdmin);
}

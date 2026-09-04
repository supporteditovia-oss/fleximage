/** Neutral shell while auth/profile resolves — prevents V2 flash for non-admins. */
export function AuthResolveShell() {
  return (
    <div
      className="flex min-h-[100svh] items-center justify-center"
      style={{
        background:
          "linear-gradient(165deg, #ffffff 0%, #f5f0e8 42%, #ebe6df 100%)",
      }}
      role="status"
      aria-live="polite"
      aria-label="Chargement"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--lx-gold)] border-t-transparent" />
    </div>
  );
}

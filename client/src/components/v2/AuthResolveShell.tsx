/** Neutral shell while auth/profile resolves — prevents V2 flash for non-admins. */
export function AuthResolveShell() {
  return (
    <div
      className="flex min-h-[100svh] items-center justify-center"
      style={{
        background:
          "linear-gradient(165deg, #12100e 0%, #1a1714 42%, #141210 100%)",
      }}
      role="status"
      aria-live="polite"
      aria-label="Chargement"
    >
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--lx-gold)] border-t-transparent" />
    </div>
  );
}

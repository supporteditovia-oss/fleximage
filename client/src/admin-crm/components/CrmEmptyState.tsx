import GlassCard from "@/admin-crm/components/ui/GlassCard";

export function CrmEmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <GlassCard variant="flat" className="py-12 text-center">
      <p className="text-sm text-[var(--lux-text)]">{title}</p>
      {hint ? (
        <p className="text-xs text-[var(--lux-text-muted)] mt-2 max-w-md mx-auto">
          {hint}
        </p>
      ) : null}
    </GlassCard>
  );
}

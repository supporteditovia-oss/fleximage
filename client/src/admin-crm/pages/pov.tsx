import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/admin-crm/components/ui/GlassCard";
import { useCrmPov, useCrmInvalidate } from "@/admin-crm/hooks/use-crm-queries";
import { crmApi } from "@/admin-crm/lib/crm-api";
import type { CrmPlatform, CrmPovPreset } from "@/admin-crm/types";
import { COUNTRY_META } from "@/admin-crm/lib/constants";
import { Wand2, Loader2 } from "lucide-react";

export default function PovPage() {
  const { data: preset, isLoading } = useCrmPov();
  const invalidate = useCrmInvalidate();
  const [form, setForm] = useState<Partial<CrmPovPreset>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (preset) setForm(preset);
  }, [preset]);

  async function save() {
    setSaving(true);
    try {
      await crmApi.pov.save({ ...form, id: preset?.id });
      invalidate();
    } finally {
      setSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="lux-display text-2xl">POV Engine</h1>
        <p className="text-sm text-[var(--lux-text-muted)]">
          Présets sauvegardés en base — génération IA à brancher
        </p>
      </div>

      <GlassCard className="space-y-4 lux-glow-gold">
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Hook" value={form.hook || ""} onChange={(v) => setForm({ ...form, hook: v })} />
          <Input label="Niche" value={form.niche || ""} onChange={(v) => setForm({ ...form, niche: v })} />
          <Input label="Émotion" value={form.emotion || ""} onChange={(v) => setForm({ ...form, emotion: v })} />
          <Input
            label="Langue"
            value={form.language_code || ""}
            onChange={(v) => setForm({ ...form, language_code: v })}
          />
          <label className="text-xs text-[var(--lux-text-muted)]">
            Pays
            <select
              className="crm-input mt-1"
              value={form.country_code || "FR"}
              onChange={(e) => setForm({ ...form, country_code: e.target.value })}
            >
              {Object.entries(COUNTRY_META).map(([code, c]) => (
                <option key={code} value={code}>
                  {c.flag} {c.label}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Style POV"
            value={form.pov_style || ""}
            onChange={(v) => setForm({ ...form, pov_style: v })}
          />
          <Input
            label="Personnage"
            value={form.character || ""}
            onChange={(v) => setForm({ ...form, character: v })}
          />
          <Input
            label="Ambiance"
            value={form.ambiance || ""}
            onChange={(v) => setForm({ ...form, ambiance: v })}
          />
          <Input
            label="Durée (s)"
            type="number"
            value={String(form.duration_seconds ?? "")}
            onChange={(v) =>
              setForm({ ...form, duration_seconds: v ? Number(v) : null })
            }
          />
          <label className="text-xs text-[var(--lux-text-muted)]">
            Plateforme
            <select
              className="crm-input mt-1"
              value={form.platform || "tiktok"}
              onChange={(e) =>
                setForm({ ...form, platform: e.target.value as CrmPlatform })
              }
            >
              <option value="tiktok">TikTok</option>
              <option value="instagram">Instagram</option>
              <option value="youtube">YouTube</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => void save()}
            disabled={saving}
            className="px-4 py-2 rounded-xl text-sm border border-[var(--lux-glass-border)]"
          >
            {saving ? "Enregistrement…" : "Sauvegarder le preset"}
          </motion.button>
          <button
            type="button"
            disabled
            title="Génération IA — prochaine étape"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm bg-[var(--lux-gold-soft)] text-[var(--lux-gold)] opacity-40 cursor-not-allowed"
          >
            <Wand2 size={16} />
            Générer
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="text-xs text-[var(--lux-text-muted)]">
      {label}
      <input
        type={type}
        className="crm-input mt-1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

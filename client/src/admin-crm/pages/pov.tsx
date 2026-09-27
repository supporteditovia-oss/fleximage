

import { useState } from "react";
import { Play, Sparkles } from "lucide-react";
import GlassCard from "@/admin-crm/components/ui/GlassCard";

const NICHES = ["Luxe", "Motivation", "Storytime", "Humour"];
const EMOTIONS = ["Aspiration", "Curiosité", "Urgence", "Nostalgie"];
const LANGUES = ["Français", "Anglais", "Espagnol"];

export default function PovEnginePage() {
  const [niche, setNiche] = useState("Luxe");
  const [emotion, setEmotion] = useState("Aspiration");
  const [langue, setLangue] = useState("Français");
  const [prompt, setPrompt] = useState("");

  return (
    <div className="max-w-6xl">
      <div className="mb-6">
        <h1 className="lux-display text-2xl">POV Engine</h1>
        <p className="text-sm text-[var(--lux-text-muted)]">Génération de POV — IA à brancher</p>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Aperçu vidéo */}
        <GlassCard className="aspect-[9/14] flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent" />
          <div className="h-14 w-14 rounded-full bg-white/5 border border-[var(--lux-glass-border)] flex items-center justify-center">
            <Play size={20} className="text-[var(--lux-text-muted)] ml-0.5" />
          </div>
          <span className="absolute bottom-4 text-xs text-[var(--lux-text-faint)]">
            Sélectionne un média depuis la Bibliothèque
          </span>
        </GlassCard>

        {/* Paramètres de génération */}
        <div className="space-y-5">
          <GlassCard variant="flat">
            <label className="block text-xs text-[var(--lux-text-muted)] mb-2">Contexte / hook</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="POV : tu viens de signer ton premier contrat immobilier..."
              className="w-full rounded-lg bg-black/30 border border-[var(--lux-glass-border)] px-3.5 py-2.5 text-sm outline-none focus:border-[var(--lux-gold)] resize-none transition-colors duration-200"
            />
          </GlassCard>

          <div className="grid grid-cols-3 gap-3">
            <Select label="Niche" value={niche} setValue={setNiche} options={NICHES} />
            <Select label="Émotion" value={emotion} setValue={setEmotion} options={EMOTIONS} />
            <Select label="Langue" value={langue} setValue={setLangue} options={LANGUES} />
          </div>

          <GlassCard variant="flat" className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--lux-text-muted)] mb-1">Score viral estimé</p>
              <p className="lux-display text-3xl" style={{ color: "var(--lux-gold)" }}>—</p>
            </div>
            <p className="text-xs text-[var(--lux-text-faint)] max-w-[10rem] text-right">
              Calculé après génération
            </p>
          </GlassCard>

          <button
            disabled
            title="IA non encore branchée"
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--lux-gold)] text-[#1a1408] text-sm font-medium py-3 opacity-50 cursor-not-allowed"
          >
            <Sparkles size={16} />
            Générer
          </button>
        </div>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  setValue,
  options,
}: {
  label: string;
  value: string;
  setValue: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-xs text-[var(--lux-text-muted)] mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-lg bg-black/30 border border-[var(--lux-glass-border)] px-3 py-2 text-sm outline-none focus:border-[var(--lux-gold)] transition-colors duration-200"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

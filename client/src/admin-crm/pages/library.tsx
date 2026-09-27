import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/admin-crm/components/ui/GlassCard";
import { CrmEmptyState } from "@/admin-crm/components/CrmEmptyState";
import { useCrmMedia, useCrmInvalidate } from "@/admin-crm/hooks/use-crm-queries";
import { crmApi } from "@/admin-crm/lib/crm-api";
import { CRM_MEDIA_FOLDERS } from "@/admin-crm/lib/constants";
import type { CrmMedia } from "@/admin-crm/types";
import { UploadCloud, Search, Star, Loader2 } from "lucide-react";

export default function LibraryPage() {
  const [folder, setFolder] = useState("photos/normal");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const { data, isLoading, error } = useCrmMedia(folder, search);
  const invalidate = useCrmInvalidate();

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (!files?.length) return;
      void (async () => {
        for (const file of Array.from(files)) {
          const url = URL.createObjectURL(file);
          await crmApi.media.create({
            folder_key: folder,
            name: file.name,
            media_type: file.type.startsWith("video") ? "video" : "image",
            file_url: url,
            thumbnail_url: url,
            status: "pending",
          });
        }
        invalidate();
      })();
    },
    [folder, invalidate],
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function bulkDelete() {
    if (!selected.size) return;
    await crmApi.media.bulkDelete([...selected]);
    setSelected(new Set());
    invalidate();
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (error) {
    return <CrmEmptyState title="Bibliothèque indisponible" hint={String(error)} />;
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="lux-display text-2xl">Bibliothèque</h1>
        <p className="text-sm text-[var(--lux-text-muted)]">
          Dossiers structurés — drop, tags, filtres
        </p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <GlassCard variant="flat" className="md:col-span-1 space-y-3">
          {CRM_MEDIA_FOLDERS.map((group) => (
            <div key={group.id}>
              <p className="text-xs text-[var(--lux-text-muted)] mb-1">📁 {group.label}</p>
              {group.children.map((child) => (
                <button
                  key={child.key}
                  type="button"
                  onClick={() => setFolder(child.key)}
                  className={`block w-full text-left text-sm px-2 py-1.5 rounded-lg ${
                    folder === child.key
                      ? "bg-[var(--lux-glass)] text-[var(--lux-text)]"
                      : "text-[var(--lux-text-muted)] hover:text-[var(--lux-text)]"
                  }`}
                >
                  {child.label}
                </button>
              ))}
            </div>
          ))}
        </GlassCard>

        <div className="md:col-span-3 space-y-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--lux-text-faint)]"
              />
              <input
                className="crm-input pl-9"
                placeholder="Rechercher…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {selected.size > 0 ? (
              <button
                type="button"
                onClick={() => void bulkDelete()}
                className="text-xs text-[var(--lux-danger)] px-3 py-2 border border-[var(--lux-danger)]/30 rounded-lg"
              >
                Supprimer ({selected.size})
              </button>
            ) : null}
          </div>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="rounded-2xl border border-dashed border-[var(--lux-glass-border)] p-6 text-center text-sm text-[var(--lux-text-muted)] mb-2"
          >
            <UploadCloud className="mx-auto mb-2 opacity-60" size={24} />
            Glisser-déposer ici — upload stockage (S3/R2) à brancher sur `file_url`
          </div>

          {!data?.length ? (
            <CrmEmptyState title="Dossier vide" hint="Importe des médias ou change de dossier." />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence>
                {data.map((item: CrmMedia) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <GlassCard
                      variant="flat"
                      className={`p-0 overflow-hidden cursor-pointer ring-1 ${
                        selected.has(item.id) ? "ring-[var(--lux-gold)]" : "ring-transparent"
                      }`}
                      onClick={() => toggleSelect(item.id)}
                    >
                      <div className="aspect-video bg-black/40 relative">
                        {item.thumbnail_url ? (
                          <img
                            src={item.thumbnail_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                        {item.is_favorite ? (
                          <Star
                            size={14}
                            className="absolute top-2 right-2 text-[var(--lux-gold)]"
                            fill="currentColor"
                          />
                        ) : null}
                      </div>
                      <div className="p-3 space-y-1">
                        <p className="text-sm truncate">{item.name}</p>
                        <p className="text-[10px] text-[var(--lux-text-muted)]">
                          {item.status} · {item.niche || "—"} · {item.country_code || "—"}
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {item.tags?.slice(0, 3).map((t) => (
                            <span
                              key={t}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--lux-glass)]"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

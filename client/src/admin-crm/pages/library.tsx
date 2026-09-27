import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/admin-crm/components/ui/GlassCard";
import { CrmEmptyState } from "@/admin-crm/components/CrmEmptyState";
import {
  useCrmMedia,
  useCrmFolders,
  useCrmInvalidate,
} from "@/admin-crm/hooks/use-crm-queries";
import { crmApi } from "@/admin-crm/lib/crm-api";
import {
  fileToBase64,
  isAllowedMediaFile,
  MEDIA_ACCEPT,
} from "@/admin-crm/lib/crm-files";
import type { CrmMedia } from "@/admin-crm/types";
import { UploadCloud, Search, Star, Loader2, FolderPlus } from "lucide-react";

export default function LibraryPage() {
  const [folder, setFolder] = useState("photos/normal");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderLabel, setNewFolderLabel] = useState("");
  const [newFolderGroup, setNewFolderGroup] = useState<"photos" | "videos">("photos");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: folders, isLoading: foldersLoading } = useCrmFolders();
  const { data, isLoading } = useCrmMedia(folder, search);
  const invalidate = useCrmInvalidate();

  const grouped = useMemo(() => {
    const photos = (folders || []).filter((f) => f.parent_group === "photos");
    const videos = (folders || []).filter((f) => f.parent_group === "videos");
    return { photos, videos };
  }, [folders]);

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files).filter(isAllowedMediaFile);
      if (!list.length) return;
      setUploading(true);
      try {
        for (const file of list) {
          const dataBase64 = await fileToBase64(file);
          await crmApi.media.upload({
            folder_key: folder,
            fileName: file.name,
            contentType: file.type,
            dataBase64,
          });
        }
        invalidate();
      } finally {
        setUploading(false);
      }
    },
    [folder, invalidate],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files?.length) {
        void uploadFiles(e.dataTransfer.files);
      }
    },
    [uploadFiles],
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

  async function createFolder() {
    if (!newFolderLabel.trim()) return;
    const created = await crmApi.folders.create({
      label: newFolderLabel.trim(),
      parent_group: newFolderGroup,
    });
    setFolder(created.folder_key);
    setNewFolderOpen(false);
    setNewFolderLabel("");
    invalidate();
  }

  if (isLoading || foldersLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="lux-display text-2xl">Bibliothèque</h1>
          <p className="text-sm text-[var(--lux-text-muted)]">
            JPG, PNG, WEBP, MP4, MOV → Supabase Storage
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setNewFolderOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-[var(--lux-glass-border)]"
          >
            <FolderPlus size={16} /> Nouveau dossier
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm bg-[var(--lux-gold-soft)] text-[var(--lux-gold)]"
          >
            <UploadCloud size={16} /> Importer
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={MEDIA_ACCEPT.accept}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) void uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <GlassCard variant="flat" className="md:col-span-1 space-y-4">
          <div>
            <p className="text-xs text-[var(--lux-text-muted)] mb-1">📸 Photos</p>
            {grouped.photos.map((child) => (
              <button
                key={child.folder_key}
                type="button"
                onClick={() => setFolder(child.folder_key)}
                className={`block w-full text-left text-sm px-2 py-1.5 rounded-lg ${
                  folder === child.folder_key
                    ? "bg-[var(--lux-glass)] text-[var(--lux-text)]"
                    : "text-[var(--lux-text-muted)] hover:text-[var(--lux-text)]"
                }`}
              >
                {child.label}
              </button>
            ))}
          </div>
          <div>
            <p className="text-xs text-[var(--lux-text-muted)] mb-1">🎥 Vidéos</p>
            {grouped.videos.map((child) => (
              <button
                key={child.folder_key}
                type="button"
                onClick={() => setFolder(child.folder_key)}
                className={`block w-full text-left text-sm px-2 py-1.5 rounded-lg ${
                  folder === child.folder_key
                    ? "bg-[var(--lux-glass)] text-[var(--lux-text)]"
                    : "text-[var(--lux-text-muted)] hover:text-[var(--lux-text)]"
                }`}
              >
                {child.label}
              </button>
            ))}
          </div>
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
            className="rounded-2xl border border-dashed border-[var(--lux-glass-border)] p-6 text-center text-sm text-[var(--lux-text-muted)]"
          >
            <UploadCloud className="mx-auto mb-2 opacity-60" size={24} />
            {uploading ? "Import en cours…" : "Glisser-déposer des fichiers ici"}
          </div>

          {!data?.length ? (
            <CrmEmptyState title="Dossier vide" hint="Importe des médias pour ce dossier." />
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
                          {item.status} · {item.country_code || "—"}
                        </p>
                      </div>
                    </GlassCard>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {newFolderOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <GlassCard className="w-full max-w-sm space-y-3 lux-glow-gold">
            <h2 className="lux-display text-lg">Nouveau dossier</h2>
            <select
              className="crm-input"
              value={newFolderGroup}
              onChange={(e) =>
                setNewFolderGroup(e.target.value as "photos" | "videos")
              }
            >
              <option value="photos">📸 Photos</option>
              <option value="videos">🎥 Vidéos</option>
            </select>
            <input
              className="crm-input"
              placeholder="Nom du dossier"
              value={newFolderLabel}
              onChange={(e) => setNewFolderLabel(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setNewFolderOpen(false)} className="text-sm px-3">
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void createFolder()}
                className="px-4 py-2 rounded-lg bg-[var(--lux-gold-soft)] text-[var(--lux-gold)] text-sm"
              >
                Créer
              </button>
            </div>
          </GlassCard>
        </div>
      ) : null}
    </div>
  );
}

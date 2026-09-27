

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, Search, Folder, Play, Image as ImageIcon } from "lucide-react";
import GlassCard from "@/admin-crm/components/ui/GlassCard";

type Media = {
  id: number;
  name: string;
  type: "video" | "image";
  folder: string;
  tags: string[];
  status: "Prêt" | "En attente" | "Analyse";
};

const FOLDERS = ["Tous", "Luxe", "Motivation", "France", "Brouillons"];

const MEDIAS: Media[] = [
  { id: 1, name: "lot_luxe_04.mp4", type: "video", folder: "Luxe", tags: ["voiture", "pov"], status: "Prêt" },
  { id: 2, name: "photo_voyage_02.jpg", type: "image", folder: "Luxe", tags: ["voyage"], status: "En attente" },
  { id: 3, name: "brut_motivation_11.mp4", type: "video", folder: "Motivation", tags: ["routine"], status: "Analyse" },
  { id: 4, name: "hotel_suite_01.jpg", type: "image", folder: "Luxe", tags: ["hotel"], status: "Prêt" },
  { id: 5, name: "france_streetstyle.mp4", type: "video", folder: "France", tags: ["mode"], status: "Prêt" },
  { id: 6, name: "draft_idea_03.mp4", type: "video", folder: "Brouillons", tags: [], status: "En attente" },
];

const STATUS_DOT: Record<Media["status"], string> = {
  Prêt: "var(--lux-success)",
  "En attente": "var(--lux-text-faint)",
  Analyse: "var(--lux-gold)",
};

export default function LibraryPage() {
  const [activeFolder, setActiveFolder] = useState("Tous");
  const [query, setQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const filtered = useMemo(() => {
    return MEDIAS.filter((m) => {
      const inFolder = activeFolder === "Tous" || m.folder === activeFolder;
      const inQuery = m.name.toLowerCase().includes(query.toLowerCase());
      return inFolder && inQuery;
    });
  }, [activeFolder, query]);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="lux-display text-2xl">Bibliothèque</h1>
          <p className="text-sm text-[var(--lux-text-muted)]">{filtered.length} éléments</p>
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--lux-text-faint)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un média..."
            className="w-64 rounded-lg bg-black/30 border border-[var(--lux-glass-border)] pl-9 pr-3 py-2 text-sm outline-none focus:border-[var(--lux-gold)] transition-colors duration-200"
          />
        </div>
      </div>

      <div className="grid grid-cols-[180px_1fr] gap-6">
        {/* Sidebar de dossiers, façon Finder */}
        <div className="space-y-1">
          {FOLDERS.map((folder) => (
            <button
              key={folder}
              onClick={() => setActiveFolder(folder)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors duration-200 ${
                activeFolder === folder
                  ? "bg-[var(--lux-glass)] text-[var(--lux-text)]"
                  : "text-[var(--lux-text-muted)] hover:text-[var(--lux-text)]"
              }`}
            >
              <Folder size={15} />
              {folder}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {/* Zone de dépôt */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              // Branchement réel de l'upload (S3/R2) à faire ici — e.dataTransfer.files
            }}
            className={`rounded-2xl border-2 border-dashed p-8 flex flex-col items-center justify-center gap-2 transition-colors duration-200 ${
              isDragging
                ? "border-[var(--lux-gold)] bg-[var(--lux-gold-soft)]"
                : "border-[var(--lux-glass-border)]"
            }`}
          >
            <UploadCloud size={22} className={isDragging ? "text-[var(--lux-gold)]" : "text-[var(--lux-text-faint)]"} />
            <p className="text-sm text-[var(--lux-text-muted)]">
              Glisse tes vidéos ou photos ici, ou{" "}
              <span className="text-[var(--lux-gold)] cursor-pointer">parcours tes fichiers</span>
            </p>
          </div>

          {/* Grille de médias */}
          <div className="grid grid-cols-4 gap-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((media) => (
                <motion.div
                  key={media.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <GlassCard
                    variant="flat"
                    className="aspect-[9/16] p-0 overflow-hidden relative group cursor-pointer"
                  >
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/10 transition-colors duration-200">
                      {media.type === "video" ? (
                        <Play size={20} className="text-[var(--lux-text-muted)]" />
                      ) : (
                        <ImageIcon size={20} className="text-[var(--lux-text-muted)]" />
                      )}
                    </div>

                    <div className="absolute top-2 left-2 h-1.5 w-1.5 rounded-full" style={{ background: STATUS_DOT[media.status] }} />

                    <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/70 to-transparent">
                      <p className="text-[11px] text-[var(--lux-text)] truncate">{media.name}</p>
                      {media.tags.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {media.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-[var(--lux-text-muted)]"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

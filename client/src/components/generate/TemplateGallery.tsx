import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Search,
  X,
  Loader2,
  Sparkles,
  ChevronDown,
  Star,
} from "lucide-react";
import { useTemplates } from "@/hooks/use-templates";
import { useFavorites, useToggleFavorite } from "@/hooks/use-favorites";
import type { PromptTemplate } from "@shared/schema";
import { useTranslation } from "react-i18next";
import {
  getLocalizedTemplateCategoryName,
  getLocalizedTemplateName,
} from "@/lib/template-utils";
import { TemplateIllustrationMedia } from "@/components/templates/TemplateIllustrationMedia";

interface TemplateGalleryProps {
  selectedTemplateId: string | null;
  onSelectTemplate: (tpl: PromptTemplate) => void;
  onDeselectTemplate: () => void;
}

export function TemplateGallery({
  selectedTemplateId,
  onSelectTemplate,
  onDeselectTemplate,
}: TemplateGalleryProps) {
  const { t, i18n } = useTranslation();
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { data: templates, isLoading: templatesLoading } = useTemplates();
  const { data: favoriteIds = [] } = useFavorites();
  const toggleFavorite = useToggleFavorite();

  const normalize = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

  const filtered = (templates || [])
    .filter((t) => {
      const q = normalize(search);
      if (!q) return true;
      return (
        normalize(getLocalizedTemplateName(t, i18n.language)).includes(q) ||
        (t.name_en && normalize(t.name_en).includes(q)) ||
        (t.keywords && normalize(t.keywords).includes(q)) ||
        (getLocalizedTemplateCategoryName(t, i18n.language) &&
          normalize(getLocalizedTemplateCategoryName(t, i18n.language) || "").includes(q)) ||
        (t.category && normalize(t.category).includes(q))
      );
    })
    .sort((a, b) => {
      const aFav = favoriteIds.includes(a.id) ? 0 : 1;
      const bFav = favoriteIds.includes(b.id) ? 0 : 1;
      return aFav - bFav;
    });

  return (
    <div className="flex flex-col gap-6 scroll-mt-20 max-w-3xl mx-auto">
      <h2 className="font-display text-2xl md:text-3xl font-bold text-center w-full">
        <span className="relative inline-block">
          {t("templateGallery.title")}
          <svg
            className="pointer-events-none absolute left-0 right-0 mx-auto bottom-[-0.25em] md:bottom-[-0.35em] w-full h-[0.3em] md:h-[0.34em] text-primary/50"
            viewBox="0 0 100 12"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M2 8 Q 50 2 98 8"
              stroke="currentColor"
              strokeWidth="5"
              strokeLinecap="round"
            ></path>
          </svg>
        </span>
      </h2>

      {/* Search bar — expands on focus */}
      <motion.div
        animate={{ width: searchOpen ? "100%" : "75%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="mx-auto flex items-center gap-2 md:gap-3 rounded-lg border border-border/80 bg-white/85 backdrop-blur px-3 md:px-5 py-2.5 md:py-3.5 shadow-sm hover:border-foreground/30 focus-within:border-foreground/50 focus-within:ring-2 focus-within:ring-foreground/10 focus-within:shadow-lg transition-colors cursor-text"
        onClick={() => {
          setSearchOpen(true);
          searchInputRef.current?.focus();
        }}
      >
        <Search className="w-4 h-4 text-muted-foreground shrink-0" />
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t("templateGallery.searchPlaceholder")}
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/70"
          onFocus={() => setSearchOpen(true)}
          onBlur={() => {
            if (!search) setSearchOpen(false);
          }}
        />
        {search && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSearch("");
              searchInputRef.current?.focus();
            }}
            className="shrink-0"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
        )}
      </motion.div>

      {/* LARP grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {templatesLoading && (
          <div className="col-span-full flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {!templatesLoading && filtered.length === 0 && (
          <p className="col-span-full text-center text-muted-foreground text-sm py-8">
            {t("templateGallery.empty")}
          </p>
        )}
        {filtered.map((tpl) => {
          const isSelected = selectedTemplateId === tpl.id;
          const isFav = favoriteIds.includes(tpl.id);
          const templateName = getLocalizedTemplateName(tpl, i18n.language);

          return (
            <div
              key={tpl.id}
              onClick={() =>
                isSelected ? onDeselectTemplate() : onSelectTemplate(tpl)
              }
              className="group relative cursor-pointer flex flex-col rounded-lg overflow-hidden bg-muted transition-all hover:shadow-lg hover:-translate-y-0.5"
            >
              {/* Favorite star */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFavorite.mutate({
                    templateId: tpl.id,
                    isFavorite: isFav,
                  });
                }}
                className="absolute top-1.5 right-1.5 z-20 w-7 h-7 rounded-full bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
              >
                <Star
                  className={`w-3.5 h-3.5 transition-colors ${isFav
                      ? "fill-white text-white"
                      : "text-white/70 hover:text-white"
                    }`}
                />
              </button>
              {/* Image area — après uniquement */}
              {tpl.example_after_url ? (
                <div className="relative aspect-[2/3] w-full overflow-hidden">
                  <TemplateIllustrationMedia
                    src={tpl.example_after_url}
                    alt={templateName}
                    className="block w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="relative aspect-[2/3] w-full bg-gradient-to-br from-muted/80 to-muted flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-primary/30" />
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between gap-1 px-2.5 py-2.5 bg-card">
                <p className="text-xs font-semibold leading-tight line-clamp-2">
                  {templateName}
                </p>
                <ChevronDown
                  className={`w-3.5 h-3.5 shrink-0 -rotate-90 transition-all ${isSelected
                      ? "text-primary"
                      : "text-muted-foreground/40 group-hover:text-foreground"
                    }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

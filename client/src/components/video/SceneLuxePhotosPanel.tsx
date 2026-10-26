import { useRef, type ChangeEvent } from "react";
import { ImagePlus, X } from "lucide-react";
import {
  SCENE_LUXE_MAX_PHOTOS,
  sceneLuxeFilledCount,
  type SceneLuxePhotoSlots,
} from "@/lib/scene-luxe-reference-photos";

type SceneLuxePhotosPanelProps = {
  slots: SceneLuxePhotoSlots;
  busy: boolean;
  onAddAtSlot: (slotIndex: number, file: File) => void;
  onAddMany: (files: File[]) => void;
  onRemove: (id: string) => void;
  onRoleChange: (id: string, role: string) => void;
};

const ROLE_PLACEHOLDERS = [
  "Ex. ma voiture actuelle",
  "Ex. Urus / G-Class cible",
  "Ex. décor Dubai",
  "Ex. tenue",
  "Ex. détail jantes",
  "Ex. intérieur",
  "Ex. autre angle",
  "Ex. référence lumière",
  "Ex. bonus",
];

export function SceneLuxePhotosPanel(props: SceneLuxePhotosPanelProps) {
  const multiInputRef = useRef<HTMLInputElement>(null);
  const slotInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const filled = sceneLuxeFilledCount(props.slots);
  const canAddMore = filled < SCENE_LUXE_MAX_PHOTOS;

  const onMultiChange = (e: ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (list.length) props.onAddMany(list);
  };

  const renderCell = (slotIndex: number) => {
    const photo = props.slots[slotIndex];
    if (!photo) {
      return (
        <button
          key={`slot-${slotIndex}`}
          type="button"
          className="via-scene-photo-slot"
          disabled={props.busy || !canAddMore}
          onClick={() => slotInputRefs.current[slotIndex]?.click()}
        >
          <ImagePlus className="h-4 w-4" aria-hidden />
          Photo {slotIndex + 1}
          <input
            ref={(el) => {
              slotInputRefs.current[slotIndex] = el;
            }}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) props.onAddAtSlot(slotIndex, file);
            }}
          />
        </button>
      );
    }

    return (
      <div
        key={photo.id}
        className="via-scene-photo via-scene-photo--cell"
      >
        <div className="via-scene-photo__thumb-wrap via-scene-photo__thumb-wrap--cell">
          <img
            className="via-scene-photo__thumb"
            src={photo.previewUrl}
            alt=""
          />
          <span className="via-scene-photo__badge">ref {slotIndex + 1}</span>
          <button
            type="button"
            className="via-scene-photo__remove"
            aria-label={`Supprimer la photo ${slotIndex + 1}`}
            onClick={() => props.onRemove(photo.id)}
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        </div>
        <label className="via-scene-photo__role via-scene-photo__role--cell">
          <span className="via-scene-photo__role-label">Rôle</span>
          <input
            type="text"
            value={photo.role}
            placeholder={ROLE_PLACEHOLDERS[slotIndex] ?? "Rôle court"}
            maxLength={120}
            onChange={(e) => props.onRoleChange(photo.id, e.target.value)}
          />
        </label>
      </div>
    );
  };

  return (
    <section className="via-scene-photos" aria-label="Photos Scène et luxe">
      <div className="via-scene-photos__head">
        <p className="via-option-block__label">Photos de référence</p>
        <span className="via-scene-photos__count">
          {filled}/{SCENE_LUXE_MAX_PHOTOS}
        </span>
      </div>
      <p className="via-scene-photos__hint">
        Grille 3×3 — optionnel mais recommandé pour voiture, décor ou tenue.
        Tu peux remplir dans n&apos;importe quel ordre.
      </p>
      <div className="via-scene-photos__grid via-scene-photos__grid--nine">
        {Array.from({ length: SCENE_LUXE_MAX_PHOTOS }, (_, i) =>
          renderCell(i),
        )}
      </div>
      <div className="via-scene-photos__actions">
        <button
          type="button"
          className="via-scene-photos__multi-btn"
          disabled={props.busy || !canAddMore}
          onClick={() => multiInputRef.current?.click()}
        >
          Importer plusieurs photos…
        </button>
        <input
          ref={multiInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={onMultiChange}
        />
        {filled >= SCENE_LUXE_MAX_PHOTOS ? (
          <span className="via-scene-photos__full">Grille complète</span>
        ) : null}
      </div>
    </section>
  );
}

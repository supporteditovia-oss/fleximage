import { useMemo, useState } from "react";
import { Link } from "wouter";
import { Mic, X } from "lucide-react";
import {
  catalogPhotoForSlug,
  slugFromCatalogVoiceId,
  type MockVoiceProfile,
} from "@/lib/v2-mock-voice";

type VoiceSelectedHeroProps = {
  voiceId: string;
  name: string;
  category?: string;
  profile?: MockVoiceProfile;
  kind: "catalog" | "cloned";
  onRemove?: () => void;
};

function resolvePhotoUrl(
  profile: MockVoiceProfile | undefined,
  kind: "catalog" | "cloned",
  voiceId: string,
): string | undefined {
  if (profile?.photoUrl) return profile.photoUrl;
  if (kind !== "catalog") return undefined;
  const slug = slugFromCatalogVoiceId(profile?.id ?? voiceId);
  return slug ? catalogPhotoForSlug(slug) : undefined;
}

/** Carte voix active — photo catalogue + nom (style éditorial). */
export function VoiceSelectedHero({
  voiceId,
  name,
  category,
  profile,
  kind,
  onRemove,
}: VoiceSelectedHeroProps) {
  const photoCandidates = useMemo(() => {
    const primary = resolvePhotoUrl(profile, kind, voiceId);
    if (!primary) return [];
    const list = [primary];
    if (primary.endsWith(".jpg")) {
      list.push(primary.replace(/\.jpg$/i, ".webp"));
    } else if (primary.endsWith(".webp")) {
      list.push(primary.replace(/\.webp$/i, ".jpg"));
    }
    return list;
  }, [profile, kind, voiceId]);

  const [photoIndex, setPhotoIndex] = useState(0);
  const photoUrl = photoCandidates[photoIndex];

  const initials =
    profile?.initials ??
    name
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const accent =
    profile?.accent ??
    "linear-gradient(145deg, #1a1a1a 0%, #5c4a2a 55%, #c9a227 100%)";

  const handlePhotoError = () => {
    setPhotoIndex((prev) =>
      prev + 1 < photoCandidates.length ? prev + 1 : prev,
    );
  };

  return (
    <section className="vs-voice-hero" aria-label={`Voix active : ${name}`}>
      <div className="vs-voice-hero__visual">
        <div className="vs-voice-hero__avatar-wrap">
          <span
            className="vs-voice-hero__avatar"
            style={photoUrl ? undefined : { background: accent }}
            aria-hidden
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt=""
                className="vs-voice-hero__photo"
                width={112}
                height={112}
                decoding="async"
                onError={handlePhotoError}
              />
            ) : kind === "cloned" ? (
              <span className="vs-voice-hero__cloned-icon">
                <Mic className="h-8 w-8" strokeWidth={1.75} aria-hidden />
              </span>
            ) : (
              <span className="vs-voice-hero__initials">{initials}</span>
            )}
          </span>
          <span className="vs-voice-hero__ring" aria-hidden />
          <span className="vs-voice-hero__glow" aria-hidden />
        </div>

        <div className="vs-voice-hero__identity">
          <h3 className="vs-voice-hero__name">{name}</h3>
          {category ? (
            <span className="vs-voice-hero__tag">{category}</span>
          ) : kind === "cloned" ? (
            <span className="vs-voice-hero__tag">Ma voix</span>
          ) : null}
        </div>
      </div>

      <p className="vs-voice-hero__label">
        {kind === "catalog" ? "Voix catalogue" : "Voix active"}
      </p>

      <div className="vs-voice-hero__actions">
        {kind === "catalog" ? (
          <Link href="/bibliotheque" className="vs-voice-hero__change">
            Changer dans Catalogue
          </Link>
        ) : null}
        {onRemove ? (
          <button
            type="button"
            className="vs-voice-hero__remove"
            onClick={onRemove}
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Supprimer
          </button>
        ) : null}
      </div>
    </section>
  );
}

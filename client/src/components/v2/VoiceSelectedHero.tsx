import { Link } from "wouter";
import { X } from "lucide-react";
import type { MockVoiceProfile } from "@/lib/v2-mock-voice";

type VoiceSelectedHeroProps = {
  name: string;
  category?: string;
  profile?: MockVoiceProfile;
  kind: "catalog" | "cloned";
  onRemove?: () => void;
};

/** Cercle stylé en haut du studio — prêt pour photos plus tard. */
export function VoiceSelectedHero({
  name,
  category,
  profile,
  kind,
  onRemove,
}: VoiceSelectedHeroProps) {
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

  return (
    <section className="vs-voice-hero" aria-label="Voix active">
      <div className="vs-voice-hero__avatar-wrap">
        <span
          className="vs-voice-hero__avatar"
          style={{ background: accent }}
          aria-hidden
        >
          {profile?.photoUrl ? (
            <img
              src={profile.photoUrl}
              alt=""
              className="vs-voice-hero__photo"
              width={88}
              height={88}
              decoding="async"
            />
          ) : (
            <span className="vs-voice-hero__initials">{initials}</span>
          )}
        </span>
        <span className="vs-voice-hero__ring" aria-hidden />
      </div>
      <p className="vs-voice-hero__label">Voix active</p>
      <h3 className="vs-voice-hero__name">{name}</h3>
      {category ? (
        <span className="vs-voice-hero__tag">{category}</span>
      ) : kind === "cloned" ? (
        <span className="vs-voice-hero__tag">Ma voix</span>
      ) : null}
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

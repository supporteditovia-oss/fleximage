import { useState } from "react";
import { cn } from "@/lib/utils";

const GRADIENTS = [
  "linear-gradient(145deg,#1a1a1a,#5c4a2a)",
  "linear-gradient(145deg,#2b2118,#8b6914)",
  "linear-gradient(145deg,#14202b,#3f6f8f)",
  "linear-gradient(145deg,#231a2b,#6f4a8f)",
  "linear-gradient(145deg,#2b1414,#8f3f3f)",
  "linear-gradient(145deg,#142b1f,#3f8f63)",
];

function gradientFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash * 31 + id.charCodeAt(i)) % 9973;
  }
  return GRADIENTS[hash % GRADIENTS.length];
}

/**
 * Circular voice avatar. Tries /voice-avatars/<id>.jpg and falls back to
 * initials on a gradient, so real photos can be dropped in later.
 */
export function VoiceAvatar({
  id,
  name,
  active = false,
  size = 88,
  className,
}: {
  id: string;
  name: string;
  active?: boolean;
  size?: number;
  className?: string;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <span
      className={cn("voice-avatar", active && "is-active", className)}
      style={{ width: size, height: size, background: gradientFor(id) }}
    >
      {imageFailed ? (
        <span className="voice-avatar__initials">{initials}</span>
      ) : (
        <img
          src={`/voice-avatars/${id}.jpg`}
          alt=""
          className="voice-avatar__img"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      )}
    </span>
  );
}

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function SceneLuxePromptHelp() {
  const [open, setOpen] = useState(false);

  return (
    <div className="via-scene-help">
      <p className="via-scene-help__lead">
        Décris la transformation dans le champ ci-dessus, puis ajoute jusqu&apos;à{" "}
        <strong>9 photos</strong> pour guider la scène (voiture, décor, tenue…).
        Chaque case peut avoir un rôle court.
      </p>
      <button
        type="button"
        className="via-scene-help__toggle"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        Exemple de consigne
        <ChevronDown
          className={`via-scene-help__chev ${open ? "is-open" : ""}`}
          aria-hidden
        />
      </button>
      {open ? (
        <p className="via-scene-help__example">
          Remplace ma voiture par une Lamborghini Urus Mansory noire mat — garde
          le même cadrage, la même route et la lumière du clip.
        </p>
      ) : null}
    </div>
  );
}

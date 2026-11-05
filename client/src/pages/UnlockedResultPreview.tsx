import { useEffect } from "react";
import { UnlockedLarpView } from "@/components/generate/UnlockedLarpView";

const DEMO_LARP_ID = "preview-demo-larp-0001";
const BEFORE_URL = "/assets/landing-v2/portrait-car-original.jpg";
const AFTER_URL = "/assets/landing-v2/portrait-car-generated.jpg";

/** Preview publique — résultat HD débloqué + bouton transformation TikTok. */
export default function UnlockedResultPreview() {
  useEffect(() => {
    document.title = "Preview — Résultat débloqué | LuxeFlexIA";
  }, []);

  return (
    <UnlockedLarpView
      resultUrls={[AFTER_URL]}
      larpId={DEMO_LARP_ID}
      resultType="image"
      posterUrl={BEFORE_URL}
      onReset={() => {
        window.location.reload();
      }}
    />
  );
}

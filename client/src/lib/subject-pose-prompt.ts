export type SubjectType = "auto" | "woman" | "man" | "unspecified";
export type PoseStyle =
  | "auto"
  | "natural"
  | "elegant"
  | "streetwear"
  | "luxe"
  | "casual"
  | "editorial";

export type SubjectAnalysis = {
  subject_presentation: string;
  apparent_age: string;
  outfit_style: string;
  pose_direction: string;
  mood: string;
  activity: string;
  location_context: string;
  camera_style: string;
  source?: string;
};

export const DEFAULT_AUTO_SUMMARY_FR =
  "Analyse automatique · pose et attitude adaptées à ta photo et au contexte";

export const SUBJECT_OPTIONS: { value: SubjectType; label: string }[] = [
  { value: "auto", label: "Auto (recommandé)" },
  { value: "woman", label: "Femme" },
  { value: "man", label: "Homme" },
  { value: "unspecified", label: "Non spécifié" },
];

export const POSE_STYLE_OPTIONS: { value: PoseStyle; label: string }[] = [
  { value: "auto", label: "Auto (recommandé)" },
  { value: "natural", label: "Naturel" },
  { value: "elegant", label: "Élégant" },
  { value: "streetwear", label: "Streetwear" },
  { value: "luxe", label: "Luxe" },
  { value: "casual", label: "Décontracté" },
  { value: "editorial", label: "Editorial" },
];

export function isSubjectType(value: unknown): value is SubjectType {
  return (
    value === "auto" ||
    value === "woman" ||
    value === "man" ||
    value === "unspecified"
  );
}

export function isPoseStyle(value: unknown): value is PoseStyle {
  return (
    value === "auto" ||
    value === "natural" ||
    value === "elegant" ||
    value === "streetwear" ||
    value === "luxe" ||
    value === "casual" ||
    value === "editorial"
  );
}

export function isAdvancedSubjectPoseActive(
  subject: SubjectType,
  poseStyle: PoseStyle,
): boolean {
  return subject !== "auto" || poseStyle !== "auto";
}

export function buildSubjectPoseSummary(
  subject: SubjectType,
  poseStyle: PoseStyle,
  analysisSummary?: string | null,
): string {
  if (!isAdvancedSubjectPoseActive(subject, poseStyle)) {
    return analysisSummary?.trim() || DEFAULT_AUTO_SUMMARY_FR;
  }

  const subjectLabel =
    subject === "auto"
      ? "Auto"
      : subject === "woman"
        ? "Femme"
        : subject === "man"
          ? "Homme"
          : "Non spécifié";
  const poseLabel =
    poseStyle === "auto"
      ? "pose auto"
      : poseStyle === "natural"
        ? "pose naturelle"
        : poseStyle === "elegant"
          ? "pose élégante"
          : poseStyle === "streetwear"
            ? "pose streetwear"
            : poseStyle === "luxe"
              ? "pose luxe"
              : poseStyle === "casual"
                ? "pose décontractée"
                : "pose editorial";

  const base = analysisSummary?.trim() || DEFAULT_AUTO_SUMMARY_FR;
  return `${base} · override : ${subjectLabel}, ${poseLabel}`;
}

export function buildAnalysisSummaryFr(analysis: SubjectAnalysis): string {
  const style = analysis.outfit_style.toLowerCase();
  const styleLabel = style.includes("luxury") || style.includes("elegant")
    ? "Style élégant détecté"
    : style.includes("street")
      ? "Style streetwear détecté"
      : style.includes("athletic") || style.includes("sport")
        ? "Style sportif détecté"
        : "Style décontracté détecté";
  const mood = analysis.mood.toLowerCase();
  const moodLabel =
    mood.includes("refined") || mood.includes("charism")
      ? "attitude charismatique"
      : mood.includes("authentic") || mood.includes("confident")
        ? "attitude confiante et naturelle"
        : "attitude adaptée";
  return `${styleLabel} · ${moodLabel} · pose naturelle adaptée au lieu`;
}

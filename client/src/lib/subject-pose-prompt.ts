export type SubjectType = "auto" | "woman" | "man" | "unspecified";
export type PoseStyle =
  | "natural"
  | "elegant"
  | "streetwear"
  | "luxe"
  | "casual"
  | "editorial";

export type ResolvedSubjectType = Exclude<SubjectType, "auto">;

export const SUBJECT_OPTIONS: { value: SubjectType; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "woman", label: "Femme" },
  { value: "man", label: "Homme" },
  { value: "unspecified", label: "Non spécifié" },
];

export const POSE_STYLE_OPTIONS: { value: PoseStyle; label: string }[] = [
  { value: "natural", label: "Naturel" },
  { value: "elegant", label: "Élégant" },
  { value: "streetwear", label: "Streetwear" },
  { value: "luxe", label: "Luxe" },
  { value: "casual", label: "Décontracté" },
  { value: "editorial", label: "Editorial" },
];

const SUBJECT_GUARDS: Record<Exclude<SubjectType, "auto" | "unspecified">, string> =
  {
    woman:
      "The subject is a woman. Use a natural, confident and elegant feminine lifestyle pose. Relaxed shoulders, natural hand placement, soft but realistic posture, believable walking, standing or seated pose. Avoid rigid, overly broad, aggressive or stereotypically masculine body language. Do not exaggerate curves, glamour or sexualization.",
    man:
      "The subject is a man. Use a natural, confident and relaxed masculine lifestyle pose. Natural shoulders, realistic stance, believable walking, standing or seated pose, hands naturally relaxed, in pockets or adjusting clothing when appropriate. Avoid overly feminine poses, excessive glamour or exaggerated body language.",
  };

const POSE_LIBRARY: Record<
  PoseStyle,
  Partial<Record<"woman" | "man" | "any", string[]>>
> = {
  natural: {
    any: [
      "friend-taken smartphone photo energy",
      "slight movement, non-symmetrical posture",
      "relaxed hands, imperfect casual framing",
    ],
  },
  elegant: {
    woman: [
      "natural walk, hand on bag, glance to the side",
      "hand on railing, seated elegant posture",
    ],
    man: [
      "natural walk, one hand in pocket",
      "light lean on railing, look off-camera",
    ],
  },
  streetwear: {
    any: [
      "urban walk with relaxed shoulders",
      "hands in pockets or adjusting jacket",
      "candid street snapshot posture",
    ],
  },
  luxe: {
    woman: [
      "natural walk, hand on luxury bag, side glance",
      "hand on railing, elegant seated pose",
    ],
    man: [
      "natural walk, one hand in pocket",
      "adjust watch or jacket lapel, light railing lean",
      "look off-camera with calm confidence",
    ],
  },
  casual: {
    any: [
      "easy standing or walking pose",
      "relaxed arms, believable everyday posture",
    ],
  },
  editorial: {
    any: [
      "composed but still believable fashion pose",
      "subtle asymmetry, confident stillness or mid-step",
    ],
  },
};

const POSE_STYLE_DESCRIPTORS: Record<PoseStyle, string> = {
  natural: "natural lifestyle pose, candid smartphone energy",
  elegant: "elegant but believable lifestyle pose",
  streetwear: "streetwear lifestyle pose, urban and relaxed",
  luxe: "luxury lifestyle pose, refined but not stiff",
  casual: "casual relaxed lifestyle pose",
  editorial: "editorial fashion pose, still photoreal and respectful",
};

const SUBJECT_SUMMARY_FR: Record<ResolvedSubjectType | "auto", string> = {
  auto: "Sujet auto",
  woman: "Femme",
  man: "Homme",
  unspecified: "Sujet non spécifié",
};

const POSE_SUMMARY_FR: Record<PoseStyle, string> = {
  natural: "pose naturelle",
  elegant: "pose élégante",
  streetwear: "pose streetwear",
  luxe: "pose luxe",
  casual: "pose décontractée",
  editorial: "pose editorial",
};

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
    value === "natural" ||
    value === "elegant" ||
    value === "streetwear" ||
    value === "luxe" ||
    value === "casual" ||
    value === "editorial"
  );
}

export function resolveSubjectForGeneration(
  subject: SubjectType,
  autoResolved?: ResolvedSubjectType | null,
): ResolvedSubjectType {
  if (subject === "auto") {
    return autoResolved && autoResolved !== "auto"
      ? autoResolved
      : "unspecified";
  }
  return subject;
}

export function buildSubjectPoseSummary(
  subject: SubjectType,
  poseStyle: PoseStyle,
  autoResolved?: ResolvedSubjectType | null,
): string {
  const resolved = resolveSubjectForGeneration(subject, autoResolved);
  const subjectLabel =
    subject === "auto" && autoResolved
      ? `${SUBJECT_SUMMARY_FR[autoResolved]} (auto)`
      : SUBJECT_SUMMARY_FR[resolved];
  const poseLabel = POSE_SUMMARY_FR[poseStyle];
  const lifestyleHint =
    poseStyle === "luxe" || poseStyle === "elegant" ? ", lifestyle luxe" : "";
  return `${subjectLabel}, ${poseLabel} naturelle${lifestyleHint}.`;
}

function pickPoseHints(
  poseStyle: PoseStyle,
  resolvedSubject: ResolvedSubjectType,
): string[] {
  const bucket = POSE_LIBRARY[poseStyle];
  if (!bucket) return [];
  if (resolvedSubject === "woman" && bucket.woman) return bucket.woman;
  if (resolvedSubject === "man" && bucket.man) return bucket.man;
  return bucket.any ?? bucket.woman ?? bucket.man ?? [];
}

/** Bloc injecté côté serveur — priorité : identité → sujet → pose → décor/tenue. */
export function buildSubjectPosePromptBlock(input: {
  subject: SubjectType;
  poseStyle: PoseStyle;
  autoResolved?: ResolvedSubjectType | null;
  faceSwapLockedPose?: boolean;
}): string {
  const resolved = resolveSubjectForGeneration(
    input.subject,
    input.autoResolved,
  );
  const parts: string[] = [];

  if (input.subject === "auto" && !input.autoResolved) {
    parts.push(
      "SUBJECT AUTO: infer the subject's gender presentation from reference image 1. If unclear, keep a neutral respectful natural posture without stereotypes.",
    );
  } else if (resolved === "woman") {
    parts.push(SUBJECT_GUARDS.woman);
  } else if (resolved === "man") {
    parts.push(SUBJECT_GUARDS.man);
  } else {
    parts.push(
      "SUBJECT NEUTRAL: respect the person's natural presentation from reference image 1. Use believable lifestyle posture without forcing gendered stereotypes.",
    );
  }

  const poseDescriptor = POSE_STYLE_DESCRIPTORS[input.poseStyle];
  const poseHints = pickPoseHints(input.poseStyle, resolved);
  parts.push(
    `POSE STYLE (${input.poseStyle}): ${poseDescriptor}. Prefer: ${poseHints.join("; ") || "natural believable posture"}.`,
  );

  if (input.faceSwapLockedPose) {
    parts.push(
      "POSE LOCK NOTE: keep the exact body position from the scene reference image, but adapt hand placement, shoulder relaxation and overall body language to match the selected subject and pose style naturally within that fixed position.",
    );
  } else {
    parts.push(
      "POSE PRIORITY: identity from reference image 1 first, then subject and pose style, then outfit and decor. Avoid caricature, exaggeration or stereotype.",
    );
  }

  return parts.join(" ");
}

export type SubjectDetectionResult = {
  detected: "woman" | "man" | "uncertain";
  confidence: number;
};

/** Heuristique légère — confirmation UI si incertain (pas de vision cloud). */
export async function detectSubjectFromImage(
  file: File,
): Promise<SubjectDetectionResult> {
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = bitmap.width / Math.max(bitmap.height, 1);
    bitmap.close();
    if (ratio > 1.35 || ratio < 0.55) {
      return { detected: "uncertain", confidence: 0.25 };
    }
    return { detected: "uncertain", confidence: 0.35 };
  } catch {
    return { detected: "uncertain", confidence: 0 };
  }
}

export function needsAutoSubjectConfirmation(
  detection: SubjectDetectionResult,
): boolean {
  return detection.confidence < 0.55 || detection.detected === "uncertain";
}

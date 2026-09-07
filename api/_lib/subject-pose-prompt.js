const VALID_SUBJECTS = new Set(["auto", "woman", "man", "unspecified"]);
const VALID_POSE_STYLES = new Set([
  "natural",
  "elegant",
  "streetwear",
  "luxe",
  "casual",
  "editorial",
]);

const SUBJECT_GUARDS = {
  woman:
    "The subject is a woman. Use a natural, confident and elegant feminine lifestyle pose. Relaxed shoulders, natural hand placement, soft but realistic posture, believable walking, standing or seated pose. Avoid rigid, overly broad, aggressive or stereotypically masculine body language. Do not exaggerate curves, glamour or sexualization.",
  man:
    "The subject is a man. Use a natural, confident and relaxed masculine lifestyle pose. Natural shoulders, realistic stance, believable walking, standing or seated pose, hands naturally relaxed, in pockets or adjusting clothing when appropriate. Avoid overly feminine poses, excessive glamour or exaggerated body language.",
};

const POSE_LIBRARY = {
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

const POSE_STYLE_DESCRIPTORS = {
  natural: "natural lifestyle pose, candid smartphone energy",
  elegant: "elegant but believable lifestyle pose",
  streetwear: "streetwear lifestyle pose, urban and relaxed",
  luxe: "luxury lifestyle pose, refined but not stiff",
  casual: "casual relaxed lifestyle pose",
  editorial: "editorial fashion pose, still photoreal and respectful",
};

function normalizeSubjectType(value) {
  const key = String(value || "auto").trim().toLowerCase();
  return VALID_SUBJECTS.has(key) ? key : "auto";
}

function normalizePoseStyle(value) {
  const key = String(value || "natural").trim().toLowerCase();
  return VALID_POSE_STYLES.has(key) ? key : "natural";
}

function resolveSubjectForGeneration(subject, autoResolved) {
  if (subject === "auto") {
    return autoResolved && autoResolved !== "auto" ? autoResolved : "unspecified";
  }
  return subject;
}

function pickPoseHints(poseStyle, resolvedSubject) {
  const bucket = POSE_LIBRARY[poseStyle] || POSE_LIBRARY.natural;
  if (resolvedSubject === "woman" && bucket.woman) return bucket.woman;
  if (resolvedSubject === "man" && bucket.man) return bucket.man;
  return bucket.any || bucket.woman || bucket.man || [];
}

function buildSubjectPosePromptBlock(input = {}) {
  const subject = normalizeSubjectType(input.subject);
  const poseStyle = normalizePoseStyle(input.poseStyle);
  const autoResolved = input.autoResolved || null;
  const resolved = resolveSubjectForGeneration(subject, autoResolved);
  const parts = [];

  if (subject === "auto" && !autoResolved) {
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

  const poseHints = pickPoseHints(poseStyle, resolved);
  parts.push(
    `POSE STYLE (${poseStyle}): ${POSE_STYLE_DESCRIPTORS[poseStyle]}. Prefer: ${poseHints.join("; ") || "natural believable posture"}.`,
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

function parseSubjectPoseFromBody(body) {
  const subject = normalizeSubjectType(body?.subject_type);
  const poseStyle = normalizePoseStyle(body?.pose_style);
  const autoResolved =
    body?.subject_auto_resolved &&
    VALID_SUBJECTS.has(String(body.subject_auto_resolved))
      ? String(body.subject_auto_resolved)
      : null;
  return { subject, poseStyle, autoResolved };
}

module.exports = {
  buildSubjectPosePromptBlock,
  normalizeSubjectType,
  normalizePoseStyle,
  parseSubjectPoseFromBody,
  resolveSubjectForGeneration,
};

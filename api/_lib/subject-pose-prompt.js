const VALID_SUBJECTS = new Set(["auto", "woman", "man", "unspecified"]);
const VALID_POSE_STYLES = new Set([
  "auto",
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

const { buildAnalysisPromptBlock } = require("./subject-analysis");

function normalizeSubjectType(value) {
  const key = String(value || "auto").trim().toLowerCase();
  return VALID_SUBJECTS.has(key) ? key : "auto";
}

function normalizePoseStyle(value) {
  const key = String(value || "auto").trim().toLowerCase();
  return VALID_POSE_STYLES.has(key) ? key : "auto";
}

function parseSubjectPoseFromBody(body) {
  const subject = normalizeSubjectType(body?.subject_type);
  const poseStyle = normalizePoseStyle(body?.pose_style);
  return { subject, poseStyle };
}

function isManualSubjectOverride(subject) {
  return subject === "woman" || subject === "man" || subject === "unspecified";
}

function isManualPoseOverride(poseStyle) {
  return poseStyle !== "auto";
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
  const analysis = input.analysis || null;
  const parts = [];

  if (analysis) {
    parts.push(buildAnalysisPromptBlock(analysis));
  } else {
    parts.push(
      buildAnalysisPromptBlock(
        require("./subject-analysis").heuristicAnalysis(
          input.userPrompt || "",
          input.sceneContext || "",
        ),
      ),
    );
  }

  if (isManualSubjectOverride(subject)) {
    if (subject === "woman") {
      parts.push(`MANUAL SUBJECT OVERRIDE: ${SUBJECT_GUARDS.woman}`);
    } else if (subject === "man") {
      parts.push(`MANUAL SUBJECT OVERRIDE: ${SUBJECT_GUARDS.man}`);
    } else {
      parts.push(
        "MANUAL SUBJECT OVERRIDE: neutral presentation — no forced gendered stereotypes.",
      );
    }
  }

  if (isManualPoseOverride(poseStyle)) {
    const resolved =
      subject === "woman" ? "woman" : subject === "man" ? "man" : "any";
    const poseHints = pickPoseHints(poseStyle, resolved);
    parts.push(
      `MANUAL POSE OVERRIDE (${poseStyle}): ${POSE_STYLE_DESCRIPTORS[poseStyle]}. Prefer: ${poseHints.join("; ")}.`,
    );
  }

  if (input.faceSwapLockedPose) {
    parts.push(
      "POSE LOCK NOTE: keep the exact body position from the scene reference image, but adapt hand placement, shoulder relaxation and overall body language to match the analyzed or overridden subject naturally within that fixed position.",
    );
  }

  return parts.filter(Boolean).join(" ");
}

module.exports = {
  buildSubjectPosePromptBlock,
  normalizeSubjectType,
  normalizePoseStyle,
  parseSubjectPoseFromBody,
  isManualSubjectOverride,
  isManualPoseOverride,
};

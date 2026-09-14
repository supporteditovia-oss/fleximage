const { requireUser, readBody, sendError } = require("../_lib/user-auth");

const GOALS = new Set(["social", "fun", "pro"]);
const VIBES = new Set([
  "dubai",
  "yacht",
  "supercar",
  "jet",
  "celebrity",
  "outfit",
]);
const FORMATS = new Set(["image", "video"]);

function parseQuiz(body) {
  if (!body || typeof body !== "object") return null;
  const goal = typeof body.goal === "string" ? body.goal : "";
  const vibe = typeof body.vibe === "string" ? body.vibe : "";
  const format = typeof body.format === "string" ? body.format : "image";
  if (!GOALS.has(goal) || !VIBES.has(vibe) || !FORMATS.has(format)) {
    return null;
  }
  return {
    goal,
    vibe,
    format,
    completedAt:
      typeof body.completedAt === "number" && body.completedAt > 0
        ? body.completedAt
        : Date.now(),
  };
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const { supabase, userId } = await requireUser(req);

    if (req.method === "GET") {
      const { data, error } = await supabase
        .from("profiles")
        .select("onboarding_quiz")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;
      res.status(200).json(data?.onboarding_quiz ?? null);
      return;
    }

    if (req.method === "PUT") {
      const quiz = parseQuiz(readBody(req));
      if (!quiz) {
        res.status(400).json({ message: "Invalid quiz payload" });
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          onboarding_quiz: quiz,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId)
        .select("onboarding_quiz")
        .single();

      if (error) throw error;
      res.status(200).json(data.onboarding_quiz);
      return;
    }

    res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("profile onboarding-quiz error", error);
    sendError(res, error);
  }
};

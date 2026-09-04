const crypto = require("crypto");
const { cloneVoice, synthesizeSpeech } = require("./fish-audio");
const { uploadToR2 } = require("./r2");

const VOICE_CREDIT_COST = 5;
const MAX_TEXT_LENGTH = 1200;

async function loadProfile(supabase, userId) {
  const { data } = await supabase
    .from("profiles")
    .select("id, role, credits, is_subscriber")
    .eq("id", userId)
    .single();
  if (!data) {
    throw Object.assign(new Error("Profil introuvable"), { status: 404 });
  }
  return data;
}

function billableCost(profile) {
  return profile.role === "admin" ? 0 : VOICE_CREDIT_COST;
}

async function applyCreditDelta(supabase, params) {
  const { error } = await supabase.rpc("apply_credit_delta", {
    p_user_id: params.userId,
    p_delta: params.delta,
    p_reason: params.reason,
    p_generation_id: null,
    p_subscription_id: null,
    p_idempotency_key: params.idempotencyKey,
    p_metadata: params.metadata || {},
  });
  return error;
}

/** POST /api/larps/voice/clone */
async function handleClone(supabase, userId, body) {
  const name = String(body.name || "").trim() || "Ma voix";
  if (!body.audioDataUrl) {
    throw Object.assign(new Error("Extrait audio manquant."), { status: 400 });
  }

  const { referenceId } = await cloneVoice({
    name,
    audioDataUrl: body.audioDataUrl,
    description: body.sourceLabel || null,
  });

  const id = crypto.randomUUID();
  const { error } = await supabase.from("voice_clones").insert({
    id,
    user_id: userId,
    name,
    fish_reference_id: referenceId,
    source_type: body.sourceType || "import",
    source_label: body.sourceLabel || null,
    duration_sec: body.durationSec ?? null,
  });
  if (error) throw error;

  return { clone: { id, name }, fishReferenceId: referenceId };
}

/** POST /api/larps/voice/generate */
async function handleGenerate(supabase, userId, body) {
  const text = String(body.text || "").trim();
  if (text.length < 2) {
    throw Object.assign(new Error("Écris un texte à faire dire."), { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    throw Object.assign(
      new Error(`Texte trop long (max ${MAX_TEXT_LENGTH} caractères).`),
      { status: 400 },
    );
  }

  let referenceId = body.fishReferenceId || null;
  let voiceName = body.voiceName || null;

  // A saved clone always wins over a raw reference sent by the client.
  if (body.voiceCloneId) {
    const { data: clone } = await supabase
      .from("voice_clones")
      .select("id, name, fish_reference_id")
      .eq("id", body.voiceCloneId)
      .eq("user_id", userId)
      .maybeSingle();
    if (clone) {
      referenceId = clone.fish_reference_id;
      voiceName = voiceName || clone.name;
    }
  }

  if (!referenceId && !body.instantAudioDataUrl) {
    throw Object.assign(new Error("Choisis ou crée une voix avant de générer."), {
      status: 400,
    });
  }

  const profile = await loadProfile(supabase, userId);
  const cost = billableCost(profile);
  if (cost > 0 && (profile.credits ?? 0) < cost) {
    throw Object.assign(new Error("Plus assez de crédits pour générer."), {
      status: 403,
      code: "INSUFFICIENT_CREDITS",
    });
  }

  const generationId = crypto.randomUUID();

  if (cost > 0) {
    const creditError = await applyCreditDelta(supabase, {
      userId,
      delta: -cost,
      reason: "generation_charge",
      idempotencyKey: `voice:${generationId}:charge`,
      metadata: { kind: "voice", voice_name: voiceName },
    });
    if (creditError) throw creditError;
  }

  let audioUrl;
  try {
    const audio = await synthesizeSpeech({
      text,
      referenceId,
      instantAudioDataUrl: body.instantAudioDataUrl,
    });
    audioUrl = await uploadToR2(
      `voices/${userId}/${generationId}.mp3`,
      audio,
      "audio/mpeg",
    );
  } catch (error) {
    // Never keep the user's credits when Fish Audio failed.
    if (cost > 0) {
      await applyCreditDelta(supabase, {
        userId,
        delta: cost,
        reason: "refund",
        idempotencyKey: `voice:${generationId}:refund`,
        metadata: { kind: "voice", fail: String(error.message || error) },
      });
    }
    throw error;
  }

  const row = {
    id: generationId,
    user_id: userId,
    voice_clone_id: body.voiceCloneId || null,
    voice_name: voiceName,
    fish_reference_id: referenceId,
    text,
    audio_url: audioUrl,
    credits_spent: cost,
  };
  const { error: insertError } = await supabase
    .from("voice_generations")
    .insert(row);
  if (insertError) throw insertError;

  return { audioUrl, generation: { id: generationId, ...row } };
}

/** GET /api/larps/voice/history */
async function handleHistory(supabase, userId, limit = 30) {
  const { data, error } = await supabase
    .from("voice_generations")
    .select("id, voice_name, text, audio_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.min(Number(limit) || 30, 100));
  if (error) throw error;
  return { items: data || [] };
}

/** POST /api/larps/voice/delete */
async function handleDelete(supabase, userId, body) {
  const ids = Array.isArray(body.ids)
    ? body.ids
    : body.id
      ? [body.id]
      : [];
  if (ids.length === 0) {
    throw Object.assign(new Error("Aucun élément à supprimer."), { status: 400 });
  }
  const { error } = await supabase
    .from("voice_generations")
    .delete()
    .eq("user_id", userId)
    .in("id", ids);
  if (error) throw error;
  return { deleted: ids.length };
}

module.exports = {
  VOICE_CREDIT_COST,
  handleClone,
  handleGenerate,
  handleHistory,
  handleDelete,
};

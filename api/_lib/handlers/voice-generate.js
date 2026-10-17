const { randomUUID } = require("crypto");
const { requireUser, readBody, sendError } = require("../user-auth");
const {
  createVoiceModel,
  synthesizeSpeech,
  synthesizeWithReferenceMsgpack,
  transcribeAudio,
  waitForVoiceModelReady,
} = require("../fish-audio");
const { uploadToR2 } = require("../r2");
const { applyCreditDelta } = require("../generation");
const { humanizeVoiceScript } = require("../voice-humanize");
const {
  loadVoiceCloneManifest,
  saveVoiceGenerationManifest,
  upsertVoiceGenerationIndex,
  fetchVoiceSampleBuffer,
} = require("../voice-store");
const {
  resolveCatalogStudioSynth,
  resolveCatalogGenerationTtsSpeed,
} = require("../voice-catalog");
const { prepareVoiceCloneInlineReferenceBuffer } = require("../voice-sample-prepare");
const { applyVoiceCloneWarmthPostprocess } = require("../voice-clone-warmth-postprocess");
const {
  resolveVoiceGenerationMode,
  shouldApplyCloneWarmthPostprocess,
  shouldUseInlineIdentityClone,
} = require("../voice-generation-modes");
const {
  shouldUseDeepChestClone,
  shouldUseIncisiveClone,
} = require("../voice-clone-timbre");
const { synthesizeCatalogPresetSpeech } = require("../catalog-voice-synth");
const { transcribeCloneReferenceAudio } = require("../voice-reference-transcript");
const { normalizeVoiceLocale } = require("../landing-voice-demo");

const VOICE_CREDIT_COST = 8;

async function checkVoiceCredits(supabase, userId) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_subscriber, role, credits")
    .eq("id", userId)
    .single();

  if (!profile) {
    return { allowed: false, reason: "Profil introuvable", isAdmin: false };
  }

  if (profile.role === "admin") {
    return { allowed: true, isAdmin: true, creditCost: 0 };
  }

  if (profile.credits < VOICE_CREDIT_COST) {
    return {
      allowed: false,
      reason: profile.is_subscriber
        ? "Plus assez de jetons sur ton abonnement."
        : "Plus assez de jetons pour générer.",
      isAdmin: false,
    };
  }

  return { allowed: true, isAdmin: false, creditCost: VOICE_CREDIT_COST };
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,([\s\S]+)$/);
  if (!match) return null;
  return Buffer.from(match[2], "base64");
}

async function ensureFishReferenceId({ fishReferenceId, referenceAudio, label }) {
  if (fishReferenceId) return fishReferenceId;
  if (!referenceAudio || referenceAudio.length < 1024) {
    throw Object.assign(
      new Error(
        "Échantillon vocal invalide. Réimporte 15–20 s de voix claire (sans musique).",
      ),
      { status: 400, code: "invalid_reference_audio" },
    );
  }

  const prepared = await prepareVoiceCloneInlineReferenceBuffer(referenceAudio).catch(
    () => referenceAudio,
  );

  const fishVoice = await createVoiceModel({
    title: String(label || "LuxeFlexIA voice").slice(0, 80),
    description: "LuxeFlexIA voice generate",
    audioBuffers: [prepared],
    trainMode: "fast",
    enhanceAudioQuality: false,
  });

  return fishVoice.id;
}

function mapFishErrorMessage(message) {
  const raw = String(message || "");
  if (/reference audio is not valid/i.test(raw)) {
    return "Échantillon vocal refusé par Fish Audio. Réimporte 15–20 s de voix claire, sans musique de fond.";
  }
  if (/reference_id/i.test(raw) && /invalid|not found/i.test(raw)) {
    return "Voix introuvable côté Fish. Réimporte ton extrait et regénère.";
  }
  return raw;
}

async function resolveVoiceContext(supabase, userId, voiceCloneId, fishReferenceId) {
  if (!voiceCloneId) {
    return {
      fishReferenceId: fishReferenceId || "",
      sampleBuffer: null,
      referenceTranscript: null,
      cloneSourceType: null,
    };
  }

  const { data: cloneRow, error: cloneError } = await supabase
    .from("voice_clones")
    .select("id, fish_reference_id, user_id, sample_r2_key, source_type, metadata")
    .eq("id", voiceCloneId)
    .maybeSingle();

  if (!cloneError && cloneRow) {
    if (cloneRow.user_id !== userId) return null;
    const sampleBuffer = cloneRow.sample_r2_key
      ? await fetchVoiceSampleBuffer(cloneRow.sample_r2_key)
      : null;
    const referenceTranscript =
      typeof cloneRow.metadata?.reference_transcript === "string"
        ? cloneRow.metadata.reference_transcript.trim()
        : null;
    return {
      fishReferenceId: cloneRow.fish_reference_id,
      sampleBuffer,
      referenceTranscript: referenceTranscript || null,
      cloneSourceType: cloneRow.source_type || null,
    };
  }

  const manifest = await loadVoiceCloneManifest(userId, voiceCloneId);
  if (!manifest || manifest.user_id !== userId) return null;

  const sampleKey = manifest.sample_r2_key || manifest.metadata?.sample_r2_key;
  const sampleBuffer = sampleKey ? await fetchVoiceSampleBuffer(sampleKey) : null;
  const referenceTranscript =
    typeof manifest.metadata?.reference_transcript === "string"
      ? manifest.metadata.reference_transcript.trim()
      : null;
  return {
    fishReferenceId: manifest.fish_reference_id || manifest.fishReferenceId || "",
    sampleBuffer,
    referenceTranscript: referenceTranscript || null,
    cloneSourceType: manifest.source_type || manifest.sourceType || null,
  };
}

module.exports = async function voiceGenerateHandler(req, res) {
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ message: "Method not allowed" });
    return;
  }

  let supabase;
  let userId;
  let generationId = randomUUID();
  let creditCost = 0;
  let charged = false;
  let usedDatabase = false;

  try {
    ({ supabase, userId } = await requireUser(req));
    const body = readBody(req);
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const humanizeEnabled = body.humanize === true;
    const deliveryStyle =
      typeof body.style === "string" ? body.style.trim().toLowerCase() : "casual";

    if (!text) {
      res.status(400).json({ message: "Texte requis", code: "missing_text" });
      return;
    }

    const limitResult = await checkVoiceCredits(supabase, userId);
    if (!limitResult.allowed) {
      res.status(402).json({
        message: limitResult.reason || "Crédits insuffisants",
        code: "insufficient_credits",
      });
      return;
    }

    creditCost = limitResult.creditCost || 0;
    const isAdmin = limitResult.isAdmin === true;
    const requestLocale = normalizeVoiceLocale(req.headers["x-locale"]);

    const voiceCloneId =
      typeof body.voiceCloneId === "string" ? body.voiceCloneId.trim() : "";
    let fishReferenceId =
      typeof body.fishReferenceId === "string" ? body.fishReferenceId.trim() : "";

    const voiceContext = await resolveVoiceContext(
      supabase,
      userId,
      voiceCloneId,
      fishReferenceId,
    );

    if (voiceContext === null) {
      res.status(404).json({ message: "Voix introuvable", code: "voice_not_found" });
      return;
    }

    fishReferenceId = voiceContext.fishReferenceId || fishReferenceId;

    const instantAudio =
      typeof body.instantAudioDataUrl === "string"
        ? parseDataUrl(body.instantAudioDataUrl)
        : null;

    const fallbackAudio = instantAudio || voiceContext.sampleBuffer;

    if (!fishReferenceId && !fallbackAudio) {
      res.status(400).json({
        message: "Voix ou échantillon audio requis",
        code: "missing_voice",
      });
      return;
    }

    let voiceName = null;
    if (voiceCloneId) {
      const { data: cloneRow } = await supabase
        .from("voice_clones")
        .select("name")
        .eq("id", voiceCloneId)
        .maybeSingle();
      voiceName = cloneRow?.name || null;
      if (!voiceName) {
        const manifest = await loadVoiceCloneManifest(userId, voiceCloneId);
        voiceName = manifest?.name || null;
      }
    }

    const catalogStudioHint =
      !voiceCloneId && fishReferenceId
        ? resolveCatalogStudioSynth(fishReferenceId)
        : null;

    if (!voiceName && catalogStudioHint?.voiceName) {
      voiceName = catalogStudioHint.voiceName;
    }

    const script = humanizeVoiceScript(text, {
      enabled: humanizeEnabled,
      style: deliveryStyle,
      voiceName,
      fastFlow: false,
    });

    const resolvedFishId = await ensureFishReferenceId({
      fishReferenceId,
      referenceAudio: fishReferenceId ? null : fallbackAudio,
      label: `LuxeFlexIA — ${voiceCloneId || userId}`,
    });

    const voiceMode = resolveVoiceGenerationMode({
      voiceCloneId,
      fishReferenceId: resolvedFishId || fishReferenceId,
      sourceType:
        typeof body.sourceType === "string" ? body.sourceType.trim() : undefined,
    });

    const referenceAudio =
      voiceContext.sampleBuffer && voiceContext.sampleBuffer.length > 1024
        ? voiceContext.sampleBuffer
        : fallbackAudio && fallbackAudio.length > 1024
          ? fallbackAudio
          : null;

    const cloneSourceType =
      voiceContext.cloneSourceType ||
      (typeof body.sourceType === "string" ? body.sourceType.trim() : null);

    const cloneFidelity = !voiceMode.isCatalogPresetVoice;

    const modeCContext = {
      generationMode: voiceMode.mode,
      cloneSourceType,
      hasInstantImport: Boolean(instantAudio && instantAudio.length > 1024),
      referenceWavBuffer: referenceAudio,
    };

    const deepChestClone = cloneFidelity && shouldUseDeepChestClone(modeCContext);

    const incisiveClone =
      cloneFidelity &&
      shouldUseIncisiveClone({
        ...modeCContext,
        voiceName,
        deliveryStyle,
      }) &&
      !deepChestClone;

    const inlineIdentityClone =
      cloneFidelity &&
      shouldUseInlineIdentityClone(modeCContext) &&
      !deepChestClone &&
      !incisiveClone;

    const generationPayload = {
      user_id: userId,
      voice_clone_id: voiceCloneId || null,
      text: script.displayText,
      status: "processing",
      fish_reference_id: resolvedFishId,
      credit_cost: creditCost,
      metadata: {
        mode: resolvedFishId ? "reference-id" : "inline-reference",
        humanized: script.humanized,
        pronunciation_fixed: script.pronunciationFixed,
        delivery_style: deliveryStyle,
        fish_script: script.fishText,
        voice_name: voiceName,
        voice_pipeline_mode: voiceMode.mode,
        deep_chest_clone: deepChestClone,
        incisive_clone: incisiveClone,
        inline_identity_clone: inlineIdentityClone,
      },
    };

    const { data: generationRow, error: insertError } = await supabase
      .from("voice_generations")
      .insert(generationPayload)
      .select("id")
      .single();

    if (!insertError && generationRow) {
      generationId = generationRow.id;
      usedDatabase = true;
    } else {
      const missingTable =
        insertError &&
        (insertError.code === "42P01" ||
          insertError.code === "PGRST205" ||
          /voice_generations/i.test(String(insertError.message || "")));
      if (!missingTable) throw insertError;
    }

    if (creditCost > 0) {
      const { error: chargeError } = await applyCreditDelta(supabase, {
        userId,
        delta: -creditCost,
        reason: "generation_charge",
        generationId: null,
        idempotencyKey: `voice:${generationId}:charge`,
        metadata: { type: "voice", voice_generation_id: generationId },
      });
      if (chargeError) throw chargeError;
      charged = true;
    }

    const ttsText = script.fishText;

    const isCatalogPresetVoice = voiceMode.isCatalogPresetVoice;
    const catalogStudio = isCatalogPresetVoice
      ? resolveCatalogStudioSynth(resolvedFishId || fishReferenceId)
      : null;
    const catalogTtsSpeed = isCatalogPresetVoice
      ? catalogStudio?.speed
      : resolveCatalogGenerationTtsSpeed(resolvedFishId || fishReferenceId);

    let inlineReferenceAudio = null;
    if (referenceAudio && referenceAudio.length > 1024 && cloneFidelity) {
      const raw =
        instantAudio && instantAudio.length > 1024 ? instantAudio : referenceAudio;
      const { prepareVoiceReferenceForGeneration } = require("../voice-sample-prepare");
      inlineReferenceAudio = await prepareVoiceReferenceForGeneration(raw, {
        generationMode: voiceMode.mode,
        incisive: incisiveClone,
      }).catch(() => raw);
    }

    const incisiveRap =
      incisiveClone && (deliveryStyle === "rap" || deliveryStyle === "hype");

    async function synthesizeInlineFromSample({ forceFreshTranscript = false } = {}) {
      const audioBuf = inlineReferenceAudio || referenceAudio;
      if (!audioBuf) return null;
      let referenceText = voiceContext.referenceTranscript;
      const mustRefreshAsr =
        incisiveClone ||
        forceFreshTranscript ||
        !referenceText ||
        referenceText.length < 3;
      if (mustRefreshAsr) {
        referenceText = await transcribeCloneReferenceAudio(audioBuf, {
          incisive: incisiveClone,
        });
      }
      return synthesizeWithReferenceMsgpack({
        text: ttsText,
        audioBuffer: audioBuf,
        referenceText,
        speed: catalogTtsSpeed,
        cloneFidelity,
        deepChestClone,
        inlineIdentityClone,
        incisiveClone,
        incisiveRap,
      });
    }

    let audioBuffer;

    async function synthesizeWithReferenceId() {
      if (!resolvedFishId) return null;
      await waitForVoiceModelReady(resolvedFishId);
      return synthesizeSpeech({
        text: ttsText,
        referenceId: resolvedFishId,
        speed: catalogTtsSpeed,
        cloneFidelity,
        deepChestClone: cloneFidelity ? deepChestClone : false,
        inlineIdentityClone: cloneFidelity ? inlineIdentityClone : false,
        incisiveClone: cloneFidelity ? incisiveClone : false,
        incisiveRap: cloneFidelity ? incisiveRap : false,
      });
    }

    if (isCatalogPresetVoice && catalogStudio?.referenceId) {
      audioBuffer = await synthesizeCatalogPresetSpeech({
        fishReferenceId: resolvedFishId || fishReferenceId,
        ttsText,
        localeLike: requestLocale,
        allowBundledReferenceFallback: isAdmin,
      });
    } else if (cloneFidelity) {
      if (incisiveClone && (inlineReferenceAudio || referenceAudio)) {
        try {
          audioBuffer = await synthesizeInlineFromSample({ forceFreshTranscript: true });
        } catch (inlineErr) {
          console.warn("voice-generate incisive inline preferred failed", inlineErr);
        }
      }
      if (!audioBuffer) {
        try {
          audioBuffer = await synthesizeWithReferenceId();
        } catch (refErr) {
          console.warn("voice-generate clone reference_id failed, fallback inline", refErr);
        }
      }
      if (!audioBuffer && (inlineReferenceAudio || referenceAudio)) {
        try {
          audioBuffer = await synthesizeInlineFromSample({ forceFreshTranscript: true });
        } catch (inlineErr) {
          console.warn("voice-generate clone inline failed", inlineErr);
        }
      }
    } else if (resolvedFishId) {
      try {
        audioBuffer = await synthesizeWithReferenceId();
      } catch (refErr) {
        console.warn("voice-generate reference_id failed, fallback inline", refErr);
        audioBuffer = await synthesizeInlineFromSample();
        if (!audioBuffer) throw refErr;
      }
    } else if (inlineReferenceAudio || referenceAudio) {
      audioBuffer = await synthesizeInlineFromSample({ forceFreshTranscript: true });
    }

    if (!audioBuffer) {
      throw Object.assign(new Error("Voix de référence indisponible"), {
        status: 400,
        code: "missing_voice",
      });
    }

    if (
      shouldApplyCloneWarmthPostprocess({
        isCatalogPresetVoice,
        generationMode: voiceMode.mode,
        incisiveClone,
        deepChestClone,
        inlineIdentityClone,
      })
    ) {
      audioBuffer = await applyVoiceCloneWarmthPostprocess(audioBuffer, {
        deepChest: deepChestClone,
        identityInline: inlineIdentityClone,
        incisive: incisiveClone,
      });
    }

    const audioKey = `voice-generations/${userId}/${generationId}.mp3`;
    const audioUrl = await uploadToR2(audioKey, audioBuffer, "audio/mpeg");
    const completedAt = new Date().toISOString();

    const completed = {
      id: generationId,
      status: "succeeded",
      audio_url: audioUrl,
      text: script.displayText,
      credit_cost: creditCost,
      created_at: completedAt,
      completed_at: completedAt,
    };

    if (usedDatabase) {
      const { data: dbCompleted, error: updateError } = await supabase
        .from("voice_generations")
        .update({
          status: "succeeded",
          audio_url: audioUrl,
          audio_r2_key: audioKey,
          completed_at: completedAt,
        })
        .eq("id", generationId)
        .select("id, status, audio_url, text, credit_cost, created_at, completed_at")
        .single();

      if (updateError) throw updateError;
      Object.assign(completed, dbCompleted);
    } else {
      await saveVoiceGenerationManifest(userId, {
        ...completed,
        user_id: userId,
        voice_clone_id: voiceCloneId || null,
        audio_r2_key: audioKey,
        metadata: generationPayload.metadata,
      });
    }

    await upsertVoiceGenerationIndex(userId, {
      ...completed,
      voice_clone_id: voiceCloneId || null,
      audio_r2_key: audioKey,
      metadata: generationPayload.metadata,
    });

    res.status(200).json({
      generation: completed,
      audioUrl,
      creditCost,
    });
  } catch (error) {
    console.error("voice-generate error", error);

    if (error && error.message) {
      error.message = mapFishErrorMessage(error.message);
    }

    if (charged && supabase && userId && generationId) {
      try {
        await applyCreditDelta(supabase, {
          userId,
          delta: creditCost,
          reason: "refund",
          generationId: null,
          idempotencyKey: `voice:${generationId}:refund`,
          metadata: { type: "voice_refund", voice_generation_id: generationId },
        });
      } catch (refundErr) {
        console.error("voice-generate refund failed", refundErr);
      }
    }

    if (supabase && usedDatabase && generationId) {
      await supabase
        .from("voice_generations")
        .update({
          status: "failed",
          fail_message: error && error.message ? String(error.message) : "Erreur serveur",
          completed_at: new Date().toISOString(),
        })
        .eq("id", generationId);
    }

    sendError(res, error);
  }
};

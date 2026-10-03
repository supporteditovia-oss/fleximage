const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  computeVideoCreditCost,
  validateVoiceText,
  buildRunwayPrompt,
  buildCarSwapPrompt,
  buildV2VProviderPrompt,
  stripVoiceInstructionsFromPrompt,
  isVehicleDrivingPrompt,
  resolveV2VProviderForStudio,
  resolveV2VProviderFromIntent,
  isAlephTransformEnabled,
  isV2VOmniTransformRolloutEnabled,
  shouldUseOmniTransformForV2V,
  buildOmniTransformPrompt,
  buildAlephSubmitPrompt,
  buildV2VCockpitIntelligenceLock,
  extractRequestedVehicleModel,
  buildKeySwapInstruction,
  buildV2VDashboardLockSuffix,
  maxVoiceCharsForDuration,
  VIDEO_FLAT_CREDIT_COST,
  VIDEO_V2V_CREDIT_COST,
} = require("./video-studio");

describe("video-studio", () => {
  it("computeVideoCreditCost I2V 5s 720p baseline", () => {
    assert.equal(
      computeVideoCreditCost({
        durationSec: 5,
        quality: "standard",
        voiceEnabled: false,
        isAdmin: false,
      }),
      VIDEO_FLAT_CREDIT_COST,
    );
  });

  it("computeVideoCreditCost I2V 3s cheaper than 5s (remise UX, pas API)", () => {
    const short = computeVideoCreditCost({
      durationSec: 3,
      quality: "standard",
      voiceEnabled: false,
      isAdmin: false,
    });
    const long = computeVideoCreditCost({
      durationSec: 5,
      quality: "standard",
      voiceEnabled: false,
      isAdmin: false,
    });
    assert.ok(short < long);
    assert.ok(long >= VIDEO_FLAT_CREDIT_COST);
  });

  it("computeVideoCreditCost I2V 1080p >> 720p (ratio Kie ~37/17)", () => {
    const hd = computeVideoCreditCost({
      durationSec: 5,
      quality: "standard",
      voiceEnabled: false,
      isAdmin: false,
    });
    const fhd = computeVideoCreditCost({
      durationSec: 5,
      quality: "high",
      voiceEnabled: false,
      isAdmin: false,
    });
    assert.ok(fhd > hd * 1.9);
  });

  it("computeVideoCreditCost adds voice extra", () => {
    assert.equal(
      computeVideoCreditCost({
        durationSec: 5,
        quality: "standard",
        voiceEnabled: true,
        isAdmin: false,
      }),
      VIDEO_FLAT_CREDIT_COST + 5,
    );
  });

  it("validateVoiceText blocks text too long for duration", () => {
    const long = "x".repeat(200);
    const result = validateVoiceText(long, 5);
    assert.equal(result.ok, false);
  });

  it("buildRunwayPrompt includes motion and single-shot policy", () => {
    const prompt = buildRunwayPrompt({
      motionPrompt: "Il marche calmement.",
      cameraMovement: "dolly_in",
      motionIntensity: "natural",
      style: "cinematic",
      voiceEnabled: false,
    });
    assert.match(prompt, /marche calmement/i);
    assert.match(prompt, /pas de diaporama/i);
    assert.match(prompt, /silent|muette|no voice/i);
  });

  it("buildRunwayPrompt strips speech tricks when voice addon off", () => {
    const prompt = buildRunwayPrompt({
      motionPrompt:
        "Il tombe dans l'eau et crie hop, mets ma voix de meuf.",
      cameraMovement: "fixed",
      motionIntensity: "natural",
      style: "cinematic",
      voiceEnabled: false,
    });
    assert.doesNotMatch(prompt, /voix/i);
    assert.match(prompt, /silent|no voice/i);
  });

  it("maxVoiceCharsForDuration", () => {
    assert.equal(maxVoiceCharsForDuration(3), 100);
    assert.equal(maxVoiceCharsForDuration(5), 140);
    assert.equal(maxVoiceCharsForDuration(10), 280);
  });

  it("computeVideoCreditCost V2V uses duration × resolution grid", () => {
    assert.equal(
      computeVideoCreditCost({
        workflow: "video_to_video",
        sourceVideoDurationSec: 5,
        v2vResolution: "720p",
        v2vProvider: "runway_aleph",
        isAdmin: false,
      }),
      85,
    );
    assert.equal(
      computeVideoCreditCost({
        workflow: "video_to_video",
        sourceVideoDurationSec: 8,
        v2vResolution: "4k",
        isAdmin: false,
      }),
      320,
    );
  });

  it("computeVideoCreditCost adds source voice extra for video_to_video", () => {
    assert.equal(
      computeVideoCreditCost({
        workflow: "video_to_video",
        sourceVideoDurationSec: 5,
        v2vResolution: "720p",
        v2vProvider: "runway_aleph",
        preserveSourceAudio: true,
        isAdmin: false,
      }),
      90,
    );
  });

  it("buildCarSwapPrompt preserves scene lock", () => {
    const prompt = buildCarSwapPrompt("Lamborghini Urus");
    assert.match(prompt, /Lamborghini Urus/i);
    assert.match(prompt, /background/i);
    assert.match(prompt, /camera movement/i);
  });

  it("stripVoiceInstructionsFromPrompt removes voice clauses", () => {
    const raw =
      "Remplace ma voiture par une Urus et mets ma voix de meuf. Garde la caméra identique.";
    const cleaned = stripVoiceInstructionsFromPrompt(raw);
    assert.doesNotMatch(cleaned, /voix/i);
    assert.match(cleaned, /Urus/i);
  });

  it("buildV2VProviderPrompt forces silent output without voice addon", () => {
    const prompt = buildV2VProviderPrompt(
      "Remplace le véhicule par une Ferrari et mets ma voix.",
      { preserveSourceAudio: false },
    );
    assert.match(prompt, /silent/i);
    assert.doesNotMatch(prompt, /voix/i);
  });

  it("buildV2VProviderPrompt keeps voice instructions when voice addon paid", () => {
    const prompt = buildV2VProviderPrompt(
      "Transporte-moi à Dubai Marina la nuit.",
      { preserveSourceAudio: true },
    );
    assert.doesNotMatch(prompt, /completely silent/i);
    assert.match(prompt, /Dubai/i);
  });

  it("isVehicleDrivingPrompt detects cockpit swaps", () => {
    assert.equal(
      isVehicleDrivingPrompt("Remplace ma Twingo par une Urus au volant"),
      true,
    );
    assert.equal(isVehicleDrivingPrompt("Transporte-moi à Dubai"), false);
  });

  it("buildV2VProviderPrompt locks dashboard speed for vehicle prompts", () => {
    const prompt = buildV2VProviderPrompt(
      "Remplace ma voiture par une Lamborghini Urus, je roule à 120 km/h au volant.",
      { preserveSourceAudio: false },
    );
    assert.match(prompt, /120 km\/h/i);
    assert.match(prompt, /INTELLIGENT STATE|vehicle realism lock/i);
    assert.match(prompt, /Lamborghini Urus/i);
  });

  it("buildV2VCockpitIntelligenceLock uses explicit speed and model fidelity", () => {
    const suffix = buildV2VCockpitIntelligenceLock(
      "Purosangue, conduis à 120 km/h, plafond étoilé",
    );
    assert.match(suffix, /exactly 120 km\/h/i);
    assert.match(suffix, /Ferrari Purosangue/i);
    assert.match(suffix, /starlight|star/i);
    assert.match(suffix, /Park \(P\)/i);
    assert.match(suffix, /Door opening/i);
  });

  it("extractRequestedVehicleModel distinguishes Urus vs Purosangue", () => {
    assert.equal(extractRequestedVehicleModel("Urus noir")?.model, "Lamborghini Urus");
    assert.equal(
      extractRequestedVehicleModel("Ferrari Purosangue")?.model,
      "Ferrari Purosangue",
    );
    assert.equal(
      extractRequestedVehicleModel("Urus Mansory, volant")?.model,
      "Lamborghini Urus Mansory",
    );
  });

  it("isVehicleDrivingPrompt detects keys and generic car swaps", () => {
    assert.equal(
      isVehicleDrivingPrompt("Je montre ma clé Twingo puis je monte dans la voiture"),
      true,
    );
    assert.equal(
      isVehicleDrivingPrompt("Remplace ma Clio par une Audi RS6"),
      true,
    );
  });

  it("buildKeySwapInstruction matches model-specific OEM keys", () => {
    const urus = buildKeySwapInstruction(extractRequestedVehicleModel("Urus"));
    const puro = buildKeySwapInstruction(
      extractRequestedVehicleModel("Ferrari Purosangue"),
    );
    assert.match(urus, /Lamborghini hexagonal key/i);
    assert.match(puro, /Ferrari red rectangular key/i);
    assert.doesNotMatch(puro, /Lamborghini/i);
  });

  it("buildKeySwapInstruction falls back for any unnamed model", () => {
    const generic = buildKeySwapInstruction(null);
    assert.match(generic, /exact target vehicle model/i);
    assert.match(generic, /OEM key fob/i);
  });

  it("resolveV2VProviderForStudio routes dance to motion, decor to transform", () => {
    assert.equal(
      resolveV2VProviderForStudio("Danse sur la plage, même mouvement"),
      "kling_motion",
    );
    assert.equal(
      resolveV2VProviderForStudio(
        "Fais danser cette personne comme sur la vidéo source",
      ),
      "kling_motion",
    );
    assert.equal(
      resolveV2VProviderForStudio(
        "Remplace l'intérieur par Urus OEM, même volant",
      ),
      "runway_aleph",
    );
    assert.equal(
      resolveV2VProviderForStudio("Transporte-moi à Dubai Marina la nuit"),
      "runway_aleph",
    );
  });

  it("resolveV2VProviderFromIntent respects the tab chosen by the client", () => {
    assert.equal(
      resolveV2VProviderFromIntent("scene", "Make it look premium and cinematic"),
      "runway_aleph",
    );
    assert.equal(
      resolveV2VProviderFromIntent("motion", "Remplace ma BMW par une Urus"),
      "kling_motion",
    );
    assert.equal(
      resolveV2VProviderFromIntent(null, "Remplace ma BMW par une Urus"),
      "runway_aleph",
    );
  });

  it("isAlephTransformEnabled is on unless V2V_ALEPH_DISABLED=1", () => {
    const prev = process.env.V2V_ALEPH_DISABLED;
    delete process.env.V2V_ALEPH_DISABLED;
    assert.equal(isAlephTransformEnabled(), true);
    process.env.V2V_ALEPH_DISABLED = "1";
    assert.equal(isAlephTransformEnabled(), false);
    if (prev === undefined) delete process.env.V2V_ALEPH_DISABLED;
    else process.env.V2V_ALEPH_DISABLED = prev;
  });

  it("buildOmniTransformPrompt forces a full brand swap for car prompts", () => {
    const prompt = buildOmniTransformPrompt(
      "Remplace la BMW par une Lamborghini Urus",
    );
    assert.match(prompt, /^Transform @Video1:/);
    assert.match(prompt, /Lamborghini Urus/);
    assert.match(prompt, /MUST CHANGE \(full cabin re-brand/i);
    assert.match(prompt, /MUST KEEP UNCHANGED \(motion lock only\)/i);
    assert.match(prompt, /Remove all original-make badges/i);
    assert.ok(prompt.length <= 2500);
  });

  it("shouldUseOmniTransformForV2V is off unless V2V_OMNI_TRANSFORM_ENABLED=1", () => {
    const prev = process.env.V2V_OMNI_TRANSFORM_ENABLED;
    delete process.env.V2V_OMNI_TRANSFORM_ENABLED;
    assert.equal(
      shouldUseOmniTransformForV2V(
        { v2v_omni_transform_rollout: true },
        "720p",
        "runway_aleph",
      ),
      false,
    );
    process.env.V2V_OMNI_TRANSFORM_ENABLED = "1";
    process.env.V2V_ALEPH_DISABLED = "1";
    assert.equal(
      shouldUseOmniTransformForV2V(
        { v2v_omni_transform_rollout: true },
        "720p",
        "runway_aleph",
      ),
      true,
    );
    if (prev === undefined) delete process.env.V2V_OMNI_TRANSFORM_ENABLED;
    else process.env.V2V_OMNI_TRANSFORM_ENABLED = prev;
    delete process.env.V2V_ALEPH_DISABLED;
  });

  it("buildAlephSubmitPrompt adds timeline wrapper when seconds mentioned", () => {
    const prompt = buildAlephSubmitPrompt(
      "À 4 s maison → villa. À 15 s Twingo → Urus.",
    );
    assert.match(prompt, /Multi-beat edit/i);
    assert.match(prompt, /4 s|Twingo/i);
  });

  it("buildOmniTransformPrompt keeps non-car scenes generic", () => {
    const prompt = buildOmniTransformPrompt("Transporte-moi à Dubai la nuit");
    assert.match(prompt, /Dubai/);
    assert.doesNotMatch(prompt, /steering wheel/i);
  });

  it("buildV2VCockpitIntelligenceLock includes dynamic key swap", () => {
    const suffix = buildV2VCockpitIntelligenceLock(
      "Remplace ma Clio et ma clé par une BMW M4",
    );
    assert.match(suffix, /KEY & ACCESSORY SWAP/i);
    assert.match(suffix, /BMW blade-style key/i);
    assert.match(suffix, /ALL car brands/i);
  });
});

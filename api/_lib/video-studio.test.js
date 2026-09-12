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
  buildV2VCockpitIntelligenceLock,
  extractRequestedVehicleModel,
  buildV2VDashboardLockSuffix,
  maxVoiceCharsForDuration,
  VIDEO_FLAT_CREDIT_COST,
} = require("./video-studio");

describe("video-studio", () => {
  it("computeVideoCreditCost flat 50 for image_to_video", () => {
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
  });

  it("maxVoiceCharsForDuration", () => {
    assert.equal(maxVoiceCharsForDuration(5), 140);
    assert.equal(maxVoiceCharsForDuration(10), 280);
  });

  it("computeVideoCreditCost flat for video_to_video", () => {
    assert.equal(
      computeVideoCreditCost({
        workflow: "video_to_video",
        sourceVideoDurationSec: 6,
        isAdmin: false,
      }),
      VIDEO_FLAT_CREDIT_COST,
    );
    assert.equal(
      computeVideoCreditCost({
        workflow: "video_to_video",
        sourceVideoDurationSec: 8,
        isAdmin: false,
      }),
      VIDEO_FLAT_CREDIT_COST,
    );
  });

  it("computeVideoCreditCost adds source voice extra for video_to_video", () => {
    assert.equal(
      computeVideoCreditCost({
        workflow: "video_to_video",
        preserveSourceAudio: true,
        isAdmin: false,
      }),
      VIDEO_FLAT_CREDIT_COST + 5,
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

  it("buildV2VCockpitIntelligenceLock includes key swap for Twingo to Urus", () => {
    const suffix = buildV2VCockpitIntelligenceLock(
      "Remplace ma Twingo et ma clé par une Urus",
    );
    assert.match(suffix, /KEY & ACCESSORY SWAP/i);
    assert.match(suffix, /Twingo key/i);
    assert.match(suffix, /ALL car brands/i);
  });
});

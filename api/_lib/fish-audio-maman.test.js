const test = require("node:test");
const assert = require("node:assert/strict");
const { applyMamanAfricaineShout, MAMAN_AFRICAINE_FISH_ID } = require("./fish-audio");

const CAPS = "TOUT LE QUARTIER REGARDE, QU'EST-CE QUE LES GENS VONT DIRE";

test("Maman Africaine — texte en majuscules → tag cri/panique", () => {
  assert.equal(
    applyMamanAfricaineShout(CAPS, MAMAN_AFRICAINE_FISH_ID),
    `[screaming] [shouting] [panicked] [hysterical] ${CAPS} !!!`,
  );
  assert.match(applyMamanAfricaineShout("ÇA ALORS, ÉCOUTE-MOI !", MAMAN_AFRICAINE_FISH_ID), /^\[screaming\]/);
});

test("Maman Africaine — texte normal ou mixte reste calme", () => {
  const calm = "Tout le quartier regarde, qu'est-ce que les gens vont dire";
  assert.equal(applyMamanAfricaineShout(calm, MAMAN_AFRICAINE_FISH_ID), calm);
  const mixed = "TOUT LE QUARTIER regarde";
  assert.equal(applyMamanAfricaineShout(mixed, MAMAN_AFRICAINE_FISH_ID), mixed);
  assert.equal(applyMamanAfricaineShout("OK", MAMAN_AFRICAINE_FISH_ID), "OK");
  assert.equal(applyMamanAfricaineShout("…", MAMAN_AFRICAINE_FISH_ID), "…");
});

test("autres voix : jamais modifiées, même en majuscules", () => {
  assert.equal(applyMamanAfricaineShout(CAPS, "22b7c6809d5d405aa6a5ae2402272b53"), CAPS);
});

test("tag d'émotion déjà présent : pas de doublon", () => {
  const t = "(whispering) CHUT";
  assert.equal(applyMamanAfricaineShout(t, MAMAN_AFRICAINE_FISH_ID), t);
});

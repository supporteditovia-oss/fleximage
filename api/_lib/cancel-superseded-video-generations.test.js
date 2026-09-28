const test = require("node:test");
const assert = require("node:assert/strict");
const {
  cancelSupersededVideoGenerations,
  CANCEL_MESSAGE_FR,
} = require("./cancel-superseded-video-generations");

function makeSupabaseMock(rows) {
  const updates = [];
  const chain = {
    select: () => chain,
    eq: () => chain,
    update(payload) {
      updates.push(payload);
      return {
        eq: () => ({
          eq: () => Promise.resolve({ error: null }),
        }),
      };
    },
    then(onFulfilled) {
      return Promise.resolve(onFulfilled({ data: rows, error: null }));
    },
  };
  return {
    supabase: { from: () => chain },
    updates,
  };
}

test("cancelSupersededVideoGenerations clôture les processing vidéo", async () => {
  const { supabase, updates } = makeSupabaseMock([
    { id: "a", metadata: {}, status: "processing" },
    { id: "b", metadata: {}, status: "processing" },
  ]);

  const result = await cancelSupersededVideoGenerations(supabase, "user-1");
  assert.equal(result.cancelledCount, 2);
  assert.equal(updates.length, 2);
  assert.equal(updates[0].status, "failed");
  assert.equal(updates[0].fail_message, CANCEL_MESSAGE_FR);
  assert.equal(updates[0].metadata.studio_cancelled, true);
});

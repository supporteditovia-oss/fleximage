const KIE_BASE_URL = "https://api.kie.ai/api/v1/jobs";

function getApiKey() {
  const key = process.env.KIE_AI_API_KEY;
  if (!key) throw new Error("KIE_AI_API_KEY environment variable is not set");
  return key;
}

async function createKieTask(input) {
  const response = await fetch(`${KIE_BASE_URL}/createTask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: "nano-banana-2",
      input,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kie.ai API error: ${response.status}: ${text}`);
  }

  return response.json();
}

async function getKieTaskStatus(taskId) {
  const response = await fetch(
    `${KIE_BASE_URL}/recordInfo?taskId=${encodeURIComponent(taskId)}`,
    {
      method: "GET",
      headers: { Authorization: `Bearer ${getApiKey()}` },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Kie.ai API error: ${response.status}: ${text}`);
  }

  return response.json();
}

module.exports = {
  createKieTask,
  getKieTaskStatus,
};

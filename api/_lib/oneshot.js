function getOneshotApiConfig() {
  return {
    url: (process.env.ONESHOT_API_URL || "").replace(/\/$/, ""),
    key: process.env.ONESHOT_API_KEY,
  };
}

async function getAppSettings(supabase) {
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["force_kie_ai", "fallback_timeout_ms"]);
    if (error) throw error;
    const map = new Map((data || []).map((row) => [row.key, row.value]));
    return {
      forceKieAi: map.get("force_kie_ai") === "true",
      fallbackTimeoutMs: Number(map.get("fallback_timeout_ms")) || 105000,
    };
  } catch {
    return { forceKieAi: false, fallbackTimeoutMs: 105000 };
  }
}

function isGoogleAiPromptFlagged(input) {
  const text = String(
    input && input.message
      ? input.message
      : typeof input === "string"
        ? input
        : JSON.stringify(input || ""),
  )
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return (
    (text.includes("prompt") && text.includes("flagg") && text.includes("google")) ||
    text.includes("prompt flagge par google ai")
  );
}

async function uploadToOneshotApi(imageBuffer, filename, contentType) {
  const config = getOneshotApiConfig();
  if (!config.url || !config.key) {
    throw new Error("Missing ONESHOT_API_URL or ONESHOT_API_KEY");
  }

  const signResponse = await fetch(`${config.url}/v1/uploads/sign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.key,
    },
    body: JSON.stringify({
      filename,
      contentType,
      sizeBytes: imageBuffer.length,
    }),
  });
  if (!signResponse.ok) {
    throw new Error(`OneshotAPI upload/sign error: ${signResponse.status}`);
  }
  const signData = await signResponse.json();

  const putResponse = await fetch(signData.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: imageBuffer,
  });
  if (!putResponse.ok) {
    throw new Error(`OneshotAPI file PUT error: ${putResponse.status}`);
  }

  const completeResponse = await fetch(`${config.url}/v1/uploads/complete`, {
    method: "POST",
    headers: {
      "x-api-key": config.key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fileId: signData.fileId }),
  });
  if (!completeResponse.ok) {
    throw new Error(`OneshotAPI upload/complete error: ${completeResponse.status}`);
  }

  return signData.fileId;
}

async function uploadImageUrlsToOneshot(imageUrls) {
  const ids = await Promise.all(
    imageUrls.map(async (publicUrl) => {
      try {
        const imgResp = await fetch(publicUrl);
        if (!imgResp.ok) throw new Error(`Failed to download ${publicUrl}`);
        const contentType = imgResp.headers.get("content-type") || "image/jpeg";
        const buffer = Buffer.from(await imgResp.arrayBuffer());
        const filename = publicUrl.split("/").pop() || "image.jpg";
        return uploadToOneshotApi(buffer, filename, contentType);
      } catch (err) {
        console.error("Failed to upload image to OneshotAPI", err);
        return null;
      }
    }),
  );
  return ids.filter((id) => typeof id === "string");
}

async function createOneshotJob(prompt, options) {
  const config = getOneshotApiConfig();
  if (!config.url || !config.key) {
    throw new Error("Missing ONESHOT_API_URL or ONESHOT_API_KEY");
  }

  const payload = {
    model: "nano-banana",
    prompt,
    options: {
      modelVariant: "quality",
      aspectRatio: (options && options.aspectRatio) || "9:16",
      ...((options && options.referenceFileIds && options.referenceFileIds.length > 0)
        ? { referenceFileIds: options.referenceFileIds }
        : {}),
    },
  };

  const response = await fetch(`${config.url}/v1/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.key,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`OneshotAPI error: ${response.status}: ${text}`);
    error.status = response.status;
    error.body = text;
    throw error;
  }

  return response.json();
}

async function getOneshotJobStatus(jobId) {
  const config = getOneshotApiConfig();
  if (!config.url || !config.key) {
    throw new Error("Missing ONESHOT_API_URL or ONESHOT_API_KEY");
  }

  const response = await fetch(`${config.url}/v1/jobs/${jobId}`, {
    method: "GET",
    headers: { "x-api-key": config.key },
  });

  if (!response.ok) {
    const text = await response.text();
    const error = new Error(`OneshotAPI error: ${response.status}: ${text}`);
    error.status = response.status;
    error.body = text;
    throw error;
  }

  return response.json();
}

module.exports = {
  getOneshotApiConfig,
  getAppSettings,
  isGoogleAiPromptFlagged,
  uploadImageUrlsToOneshot,
  createOneshotJob,
  getOneshotJobStatus,
};

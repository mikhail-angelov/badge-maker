import { readGenerateStream } from "./readGenerateStream.js";

export const generateScenario = async ({
  prompt,
  stateSummary,
  endpoint = "/api/generate-stream",
  onStatus,
}) => {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      stateSummary,
    }),
  });

  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/x-ndjson")) {
    return readGenerateStream(response, { onStatus });
  }

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Failed to generate scenario");
  }

  return {
    scenario: payload.scenario,
    warnings: Array.isArray(payload.warnings) ? payload.warnings : [],
  };
};

export default generateScenario;

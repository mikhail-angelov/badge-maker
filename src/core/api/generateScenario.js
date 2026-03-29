export const generateScenario = async ({
  prompt,
  stateSummary,
  endpoint = "/api/generate",
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

  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "Failed to generate scenario");
  }

  return payload.scenario;
};

export default generateScenario;

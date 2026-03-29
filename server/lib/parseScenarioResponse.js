const stripCodeFence = (content) =>
  content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

export const parseScenarioResponse = (content) => {
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Model response was empty");
  }

  const parsed = JSON.parse(stripCodeFence(content));
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.actions)) {
    throw new Error("Model response did not contain a valid scenario object");
  }

  return parsed;
};

export default parseScenarioResponse;

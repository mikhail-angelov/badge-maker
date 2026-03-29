import { formatGenerateRequest } from "../prompts/formatGenerateRequest.js";
import { systemPrompt } from "../prompts/systemPrompt.js";
import { parseScenarioResponse } from "../lib/parseScenarioResponse.js";
import { resolveScenarioSvgPrompts } from "./generateSvg.js";

const readJsonBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const generateWithDeepseek = async ({ prompt, stateSummary }) => {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    const error = new Error("DEEPSEEK_API_KEY is not configured");
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(
    process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: formatGenerateRequest({ prompt, stateSummary }),
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Deepseek request failed with ${response.status}`);
    error.statusCode = response.status;
    error.details = body;
    throw error;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  return parseScenarioResponse(content);
};

export const handleGenerate = async (request, response, { json }) => {
  try {
    const { prompt = "", stateSummary = { objectCount: 0, objects: [] } } =
      await readJsonBody(request);

    if (typeof prompt !== "string" || !prompt.trim()) {
      json(response, 400, { ok: false, error: "prompt must be a non-empty string" });
      return;
    }

    const scenario = await generateWithDeepseek({ prompt, stateSummary });
    const resolvedScenario = await resolveScenarioSvgPrompts(scenario);

    json(response, 200, {
      ok: true,
      provider: "deepseek",
      scenario: resolvedScenario,
    });
  } catch (error) {
    json(response, error.statusCode || 500, {
      ok: false,
      error: error.message || "Failed to generate scenario",
      details: error.details || null,
    });
  }
};

export default handleGenerate;

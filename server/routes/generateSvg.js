import { sanitizeSvgIcon } from "../../src/core/icons/sanitizeSvgIcon.js";
import { parseSvgResponse } from "../lib/parseSvgResponse.js";
import { formatGenerateSvgRequest } from "../prompts/formatGenerateSvgRequest.js";
import { systemSvgPrompt } from "../prompts/systemSvgPrompt.js";

const readJsonBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

export const generateSvgMarkupWithDeepseek = async ({ prompt }) => {
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
        messages: [
          { role: "system", content: systemSvgPrompt },
          { role: "user", content: formatGenerateSvgRequest({ prompt }) },
        ],
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Deepseek SVG request failed with ${response.status}`);
    error.statusCode = response.status;
    error.details = body;
    throw error;
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  return parseSvgResponse(content);
};

export const resolveScenarioSvgPrompts = async (scenario) => {
  const nextScenario = structuredClone(scenario);

  for (const action of nextScenario.actions || []) {
    const properties = action?.payload?.properties;
    if (!properties?.svgPrompt) {
      continue;
    }

    const svgMarkup = await generateSvgMarkupWithDeepseek({
      prompt: properties.svgPrompt,
    });
    const sanitized = sanitizeSvgIcon(svgMarkup);
    if (!sanitized.ok) {
      const error = new Error(sanitized.error);
      error.statusCode = 422;
      throw error;
    }

    properties.imageSrc = sanitized.imageSrc;
    delete properties.svgPrompt;
  }

  return nextScenario;
};

export const handleGenerateSvg = async (request, response, { json }) => {
  try {
    const { prompt = "" } = await readJsonBody(request);
    if (typeof prompt !== "string" || !prompt.trim()) {
      json(response, 400, { ok: false, error: "prompt must be a non-empty string" });
      return;
    }

    const svgMarkup = await generateSvgMarkupWithDeepseek({ prompt });
    const sanitized = sanitizeSvgIcon(svgMarkup);
    if (!sanitized.ok) {
      json(response, 422, { ok: false, error: sanitized.error });
      return;
    }

    json(response, 200, {
      ok: true,
      svgMarkup: sanitized.svgMarkup,
      imageSrc: sanitized.imageSrc,
    });
  } catch (error) {
    json(response, error.statusCode || 500, {
      ok: false,
      error: error.message || "Failed to generate SVG",
      details: error.details || null,
    });
  }
};

export default handleGenerateSvg;

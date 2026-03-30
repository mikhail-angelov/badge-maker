import { formatGenerateRequest } from "../prompts/formatGenerateRequest.js";
import { systemPrompt } from "../prompts/systemPrompt.js";
import { parseScenarioResponse } from "../lib/parseScenarioResponse.js";
import { refineScenario } from "../lib/refineScenario.js";
import { resolveScenarioSvgPrompts } from "./generateSvg.js";

const readJsonBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const generateWithDeepseek = async ({ prompt, stateSummary, forceCreateOnly = false }) => {
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
            content: formatGenerateRequest({ prompt, stateSummary, forceCreateOnly }),
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

export const shouldRetryAsCreateOnly = (error, stateSummary) => {
  if (stateSummary?.availableRoleLabels?.length) {
    return false;
  }

  const message = String(error?.message || "");
  return (
    message.includes("must include objectId or roleLabel") ||
    message.includes("must include objectIds or roleLabels")
  );
};

const createResultPayload = async ({ prompt, stateSummary, onProgress = () => {} }) => {
  onProgress({ phase: "planning", message: "Planning badge scenario..." });
  let generatedScenario;
  try {
    generatedScenario = await generateWithDeepseek({ prompt, stateSummary });
  } catch (error) {
    if (!shouldRetryAsCreateOnly(error, stateSummary)) {
      throw error;
    }

    onProgress({
      phase: "planning",
      message: "Retrying with a create-only plan because there are no targetable existing objects...",
    });
    generatedScenario = await generateWithDeepseek({
      prompt,
      stateSummary,
      forceCreateOnly: true,
    });
  }

  onProgress({ phase: "refining", message: "Refining layout and validating actions..." });
  let refinedScenario;
  try {
    refinedScenario = refineScenario(generatedScenario);
  } catch (error) {
    if (!shouldRetryAsCreateOnly(error, stateSummary)) {
      throw error;
    }

    onProgress({
      phase: "planning",
      message: "Retrying with a create-only plan because there are no targetable existing objects...",
    });
    generatedScenario = await generateWithDeepseek({
      prompt,
      stateSummary,
      forceCreateOnly: true,
    });
    refinedScenario = refineScenario(generatedScenario);
  }

  const hasSvgPrompts = (refinedScenario.scenario.actions || []).some(
    (action) => action?.payload?.properties?.svgPrompt
  );

  if (hasSvgPrompts) {
    onProgress({ phase: "icon", message: "Generating badge icon..." });
  }

  const resolvedScenario = await resolveScenarioSvgPrompts(refinedScenario.scenario);

  onProgress({ phase: "finalizing", message: "Finalizing preview..." });
  const finalScenario = refineScenario(resolvedScenario);

  return {
    ok: true,
    provider: "deepseek",
    scenario: finalScenario.scenario,
    warnings: [...new Set([...refinedScenario.warnings, ...finalScenario.warnings])],
  };
};

export const handleGenerate = async (request, response, { json }) => {
  try {
    const { prompt = "", stateSummary = { objectCount: 0, objects: [] } } =
      await readJsonBody(request);

    if (typeof prompt !== "string" || !prompt.trim()) {
      json(response, 400, { ok: false, error: "prompt must be a non-empty string" });
      return;
    }

    const payload = await createResultPayload({ prompt, stateSummary });
    json(response, 200, payload);
  } catch (error) {
    json(response, error.statusCode || 500, {
      ok: false,
      error: error.message || "Failed to generate scenario",
      details: error.details || null,
    });
  }
};

const writeStreamEvent = (response, event) => {
  response.write(`${JSON.stringify(event)}\n`);
};

export const handleGenerateStream = async (request, response) => {
  response.writeHead(200, {
    "Content-Type": "application/x-ndjson; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  });

  try {
    const { prompt = "", stateSummary = { objectCount: 0, objects: [] } } =
      await readJsonBody(request);

    if (typeof prompt !== "string" || !prompt.trim()) {
      writeStreamEvent(response, {
        type: "error",
        error: "prompt must be a non-empty string",
      });
      response.end();
      return;
    }

    const payload = await createResultPayload({
      prompt,
      stateSummary,
      onProgress: ({ phase, message }) => {
        writeStreamEvent(response, {
          type: "status",
          phase,
          message,
        });
      },
    });

    writeStreamEvent(response, {
      type: "result",
      ...payload,
    });
    response.end();
  } catch (error) {
    writeStreamEvent(response, {
      type: "error",
      error: error.message || "Failed to generate scenario",
      details: error.details || null,
    });
    response.end();
  }
};

export default handleGenerate;

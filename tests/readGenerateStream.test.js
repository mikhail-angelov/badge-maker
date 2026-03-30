import test from "node:test";
import assert from "node:assert/strict";

import { readGenerateStream } from "../src/core/api/readGenerateStream.js";

const createStreamResponse = (lines) => {
  const encoder = new TextEncoder();
  return {
    body: new ReadableStream({
      start(controller) {
        for (const line of lines) {
          controller.enqueue(encoder.encode(line));
        }
        controller.close();
      },
    }),
  };
};

test("readGenerateStream emits status updates and returns the final scenario", async () => {
  const messages = [];
  const response = createStreamResponse([
    `${JSON.stringify({ type: "status", phase: "planning", message: "Planning badge scenario..." })}\n`,
    `${JSON.stringify({
      type: "result",
      scenario: { schemaVersion: 1, actions: [{ type: "clearSelection", payload: {} }] },
      warnings: ["warning"],
    })}\n`,
  ]);

  const result = await readGenerateStream(response, {
    onStatus: (event) => {
      messages.push(event.message);
    },
  });

  assert.deepEqual(messages, ["Planning badge scenario..."]);
  assert.equal(result.scenario.schemaVersion, 1);
  assert.deepEqual(result.warnings, ["warning"]);
});

test("readGenerateStream throws streamed errors", async () => {
  const response = createStreamResponse([
    `${JSON.stringify({ type: "error", error: "Boom" })}\n`,
  ]);

  await assert.rejects(() => readGenerateStream(response), /Boom/);
});

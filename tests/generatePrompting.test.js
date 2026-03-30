import test from "node:test";
import assert from "node:assert/strict";

import { formatGenerateRequest } from "../server/prompts/formatGenerateRequest.js";
import { shouldRetryAsCreateOnly } from "../server/routes/generate.js";

test("formatGenerateRequest forbids refinement actions when no role labels are available", () => {
  const request = formatGenerateRequest({
    prompt: "create js badge",
    stateSummary: {
      objectCount: 2,
      availableRoleLabels: [],
      objects: [],
    },
  });

  assert.match(request, /There are no targetable existing objects/i);
  assert.match(request, /Do not use updateObject, removeObject, moveToFront, moveToBack, alignObjects, or selectObjects/i);
});

test("shouldRetryAsCreateOnly detects missing target references when no role labels exist", () => {
  assert.equal(
    shouldRetryAsCreateOnly(
      new Error("actions[0].payload must include objectId or roleLabel"),
      { availableRoleLabels: [] }
    ),
    true
  );

  assert.equal(
    shouldRetryAsCreateOnly(
      new Error("actions[0].payload must include objectId or roleLabel"),
      { availableRoleLabels: ["center-title"] }
    ),
    false
  );
});

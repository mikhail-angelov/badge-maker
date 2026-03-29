import test from "node:test";
import assert from "node:assert/strict";

import { formatScenarioSummary } from "../src/core/scenario/formatScenarioSummary.js";
import { validateScenario } from "../src/core/scenario/validateScenario.js";

test("validateScenario accepts a valid createShape scenario", () => {
  const scenario = {
    schemaVersion: 1,
    actions: [
      {
        type: "createShape",
        payload: {
          shapeType: "circle",
          properties: {
            x: 100,
            y: 100,
            width: 120,
            height: 120,
            color: "#000000",
          },
        },
      },
    ],
  };

  const result = validateScenario(scenario);
  assert.equal(result.ok, true);
  assert.equal(result.errors.length, 0);
});

test("validateScenario rejects unsupported fonts", () => {
  const scenario = {
    schemaVersion: 1,
    actions: [
      {
        type: "createShape",
        payload: {
          shapeType: "text",
          properties: {
            x: 10,
            y: 10,
            text: "badge",
            fontSize: 20,
            fontFamily: "Papyrus",
          },
        },
      },
    ],
  };

  const result = validateScenario(scenario);
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /fontFamily/);
});

test("formatScenarioSummary renders a readable list", () => {
  const summary = formatScenarioSummary({
    actions: [
      {
        type: "createShape",
        payload: {
          shapeType: "circle",
          roleLabel: "outer-ring",
        },
      },
      {
        type: "clearSelection",
        payload: {},
      },
    ],
  });

  assert.match(summary, /1\. Create circle as outer-ring/);
  assert.match(summary, /2\. Clear selection/);
});

test("validateScenario accepts role-label targeting", () => {
  const scenario = {
    schemaVersion: 1,
    actions: [
      {
        type: "updateObject",
        payload: {
          roleLabel: "center-title",
          properties: {
            text: "POLICE",
          },
        },
      },
    ],
  };

  const result = validateScenario(scenario);
  assert.equal(result.ok, true);
});

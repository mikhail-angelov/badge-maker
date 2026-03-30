import test from "node:test";
import assert from "node:assert/strict";

import { refineScenario } from "../server/lib/refineScenario.js";

test("refineScenario substitutes unsupported fonts with MVP-safe fonts", () => {
  const result = refineScenario({
    schemaVersion: 1,
    actions: [
      {
        type: "createShape",
        payload: {
          shapeType: "text",
          properties: {
            x: 40,
            y: 40,
            text: "BADGE",
            fontFamily: "Georgia",
          },
        },
      },
    ],
  });

  assert.equal(result.scenario.actions[0].payload.properties.fontFamily, "Arial");
  assert.equal(
    result.warnings.some((warning) => /fontFamily "Georgia" was replaced with "Arial"/.test(warning)),
    true
  );
});

test("refineScenario tightens circle-text geometry before preview", () => {
  const result = refineScenario({
    schemaVersion: 1,
    actions: [
      {
        type: "createShape",
        payload: {
          shapeType: "circle",
          properties: { x: 200, y: 160, radius: 110, color: "#f7df1e" },
        },
      },
      {
        type: "createShape",
        payload: {
          shapeType: "circle",
          properties: { x: 200, y: 160, radius: 82, color: "#1f1f1f" },
        },
      },
      {
        type: "createShape",
        payload: {
          shapeType: "circle-text",
          roleLabel: "ring-text",
          properties: {
            x: 200,
            y: 160,
            radius: 87,
            layoutMode: "top-arc",
            text: "undefined is not a function * ",
            fontFamily: "Arial",
            fontSize: 18,
            innerRadiusHint: 82,
            outerRadiusHint: 110,
          },
        },
      },
    ],
  });

  const ringText = result.scenario.actions[2].payload.properties;

  assert.equal(ringText.layoutMode, "top-arc");
  assert.equal(ringText.fontSize < 18, true);
  assert.equal(ringText.radius > 87, true);
  assert.equal("innerRadiusHint" in ringText, false);
  assert.equal("outerRadiusHint" in ringText, false);
  assert.equal(
    result.warnings.some((warning) => /fontSize was adjusted/.test(warning)),
    true
  );
});

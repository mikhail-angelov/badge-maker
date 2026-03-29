import test from "node:test";
import assert from "node:assert/strict";

import { fitCircleTextBetweenRadii } from "../src/core/fitting/fitCircleTextBetweenRadii.js";
import { sanitizeCircleTextGeometry } from "../src/core/fitting/sanitizeCircleTextGeometry.js";
import { normalizeScenario } from "../src/core/scenario/normalizeScenario.js";
import { validateScenario } from "../src/core/scenario/validateScenario.js";
import { buildStateSummary } from "../src/core/roles/buildStateSummary.js";
import { formatScenarioSummary } from "../src/core/scenario/formatScenarioSummary.js";

test("fitCircleTextBetweenRadii allows longer text in full-ring mode than top-arc mode", () => {
  const commonInput = {
    text: "undefined is not a function * ",
    fontSize: 14,
    fontFamily: "Arial",
    innerRadius: 70,
    outerRadius: 90,
  };

  const topArcFit = fitCircleTextBetweenRadii({
    ...commonInput,
    layoutMode: "top-arc",
  });
  const fullRingFit = fitCircleTextBetweenRadii({
    ...commonInput,
    layoutMode: "full-ring",
  });

  assert.equal(topArcFit.status, "cannot_fit");
  assert.equal(fullRingFit.status, "fit");
  assert.equal(fullRingFit.collision.edgeClearanceDegrees > 0, true);
});

test("sanitizeCircleTextGeometry keeps an explicit full-ring layout for long ring text", () => {
  const result = sanitizeCircleTextGeometry({
    x: 200,
    y: 160,
    radius: 96,
    text: "undefined is not a function * ",
    fontFamily: "Arial",
    fontSize: 14,
    innerRadiusHint: 82,
    outerRadiusHint: 110,
    layoutMode: "full-ring",
  });

  assert.equal(result.ok, true);
  assert.equal(result.properties.layoutMode, "full-ring");
  assert.equal(result.properties.fontSize <= 14, true);
  assert.equal(result.properties.radius >= 98, true);
});

test("validateScenario accepts explicit circle-text layoutMode and centered text anchor", () => {
  const validation = validateScenario({
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
            radius: 102,
            layoutMode: "full-ring",
            text: "undefined is not a function * ",
            fontFamily: "Arial",
            fontSize: 14,
          },
        },
      },
      {
        type: "createShape",
        payload: {
          shapeType: "text",
          roleLabel: "center-text",
          properties: {
            x: 200,
            y: 160,
            anchor: "center",
            text: "JS",
            fontFamily: "Arial",
            fontSize: 28,
          },
        },
      },
    ],
  });

  assert.equal(validation.ok, true);
});

test("buildStateSummary surfaces layout mode and centered text anchor", () => {
  const summary = buildStateSummary({
    objects: [
      {
        id: 1,
        type: "circle-text",
        roleLabel: "ring-text",
        properties: {
          x: 200,
          y: 160,
          radius: 102,
          layoutMode: "full-ring",
          text: "undefined is not a function * ",
          fontFamily: "Arial",
          fontSize: 14,
          color: "#000000",
        },
      },
      {
        id: 2,
        type: "text",
        roleLabel: "center-text",
        properties: {
          x: 200,
          y: 160,
          anchor: "center",
          text: "JS",
          fontFamily: "Arial",
          fontSize: 28,
          color: "#000000",
        },
      },
    ],
  });

  assert.equal(summary.objects[0].geometry.layoutMode, "full-ring");
  assert.equal(summary.objects[1].geometry.anchor, "center");
  assert.match(summary.objects[0].summary, /layout=full-ring/);
  assert.match(summary.objects[1].summary, /centered/);
});

test("formatScenarioSummary describes centered text and circle-text layout mode", () => {
  const summary = formatScenarioSummary({
    actions: [
      {
        type: "createShape",
        payload: {
          shapeType: "circle-text",
          roleLabel: "ring-text",
          properties: {
            layoutMode: "full-ring",
          },
        },
      },
      {
        type: "createShape",
        payload: {
          shapeType: "text",
          roleLabel: "center-text",
          properties: {
            anchor: "center",
          },
        },
      },
    ],
  });

  assert.match(summary, /Create circle-text as ring-text \[full-ring\]/);
  assert.match(summary, /Create text as center-text \[centered\]/);
});

test("normalizeScenario defaults new circle-text actions to top-arc layout mode", () => {
  const normalized = normalizeScenario({
    schemaVersion: 1,
    actions: [
      {
        type: "createShape",
        payload: {
          shapeType: "circle-text",
          properties: {
            x: 200,
            y: 160,
            radius: 96,
            text: "BADGE",
            fontFamily: "Arial",
            fontSize: 18,
          },
        },
      },
    ],
  });

  assert.equal(normalized.actions[0].payload.properties.layoutMode, "top-arc");
});

import test from "node:test";
import assert from "node:assert/strict";

import { fitCircleTextBetweenRadii } from "../src/core/fitting/fitCircleTextBetweenRadii.js";
import { sanitizeCircleTextGeometry } from "../src/core/fitting/sanitizeCircleTextGeometry.js";

test("sanitizeCircleTextGeometry converts bounding box input to centered circle-text geometry", () => {
  const result = sanitizeCircleTextGeometry({
    x: 100,
    y: 60,
    width: 200,
    height: 200,
    text: "POLICE",
    fontSize: 20,
    arcStartAngle: 180,
    arcEndAngle: 360,
    font: "Arial",
  });

  assert.equal(result.ok, true);
  assert.equal(result.properties.x, 200);
  assert.equal(result.properties.y, 160);
  assert.equal(result.properties.radius, 90);
  assert.equal(result.properties.fontFamily, "Arial");
  assert.equal(result.properties.startAngle, 0);
  assert.equal("width" in result.properties, false);
  assert.equal("arcStartAngle" in result.properties, false);
});

test("sanitizeCircleTextGeometry normalizes model arc semantics to renderer startAngle", () => {
  const result = sanitizeCircleTextGeometry({
    x: 100,
    y: 60,
    radius: 100,
    arcRadius: 100,
    startAngle: 180,
    text: "POLICE",
    fontSize: 24,
  });

  assert.equal(result.ok, true);
  assert.equal(result.properties.startAngle, 0);
  assert.equal(result.properties.radius, 88);
  assert.equal("arcRadius" in result.properties, false);
});

test("fitCircleTextBetweenRadii rejects infeasible text bands", () => {
  const result = fitCircleTextBetweenRadii({
    text: "THIS TEXT IS FAR TOO LONG FOR A TINY ARC",
    fontSize: 24,
    innerRadius: 10,
    outerRadius: 24,
  });

  assert.equal(result.status, "cannot_fit");
});

test("sanitizeCircleTextGeometry rejects non-feasible geometry", () => {
  const result = sanitizeCircleTextGeometry({
    x: 10,
    y: 10,
    radius: 18,
    text: "LONG BADGE TITLE",
    fontSize: 24,
  });

  assert.equal(result.ok, false);
  assert.match(result.error, /cannot fit/);
});

test("sanitizeCircleTextGeometry clamps off-axis start angles back to the top arc", () => {
  const result = sanitizeCircleTextGeometry({
    x: 170,
    y: 170,
    radius: 74,
    text: "POLICE",
    fontSize: 16,
    startAngle: 120,
  });

  assert.equal(result.ok, true);
  assert.equal(result.properties.startAngle, 0);
});

test("sanitizeCircleTextGeometry shrinks and repositions ring text to stay between circles", () => {
  const result = sanitizeCircleTextGeometry({
    x: 200,
    y: 150,
    radius: 87,
    text: "undefined is not a function * ",
    fontSize: 18,
    innerRadiusHint: 82,
    outerRadiusHint: 110,
  });

  assert.equal(result.ok, true);
  assert.equal(result.properties.radius >= 98, true);
  assert.equal(result.properties.radius <= 106, true);
  assert.equal(result.properties.fontSize < 18, true);
  assert.equal("innerRadiusHint" in result.properties, false);
  assert.equal("outerRadiusHint" in result.properties, false);
});

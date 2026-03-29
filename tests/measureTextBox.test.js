import test from "node:test";
import assert from "node:assert/strict";

import { measureTextBox } from "../src/core/fitting/measureTextBox.js";

test("measureTextBox returns deterministic dimensions", () => {
  const measurement = measureTextBox({
    text: "POLICE",
    fontSize: 18,
    fontFamily: "Arial",
  });

  assert.equal(typeof measurement.width, "number");
  assert.equal(typeof measurement.height, "number");
  assert.equal(measurement.width > 0, true);
  assert.equal(measurement.height > 0, true);
  assert.equal(["canvas", "approximation", "estimate"].includes(measurement.source), true);
});

test("measureTextBox accounts for kerning", () => {
  const withoutKerning = measureTextBox({
    text: "JS",
    fontSize: 18,
    fontFamily: "Arial",
    kerning: 0,
  });
  const withKerning = measureTextBox({
    text: "JS",
    fontSize: 18,
    fontFamily: "Arial",
    kerning: 8,
  });

  assert.equal(withKerning.width > withoutKerning.width, true);
});

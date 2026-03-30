import test from "node:test";
import assert from "node:assert/strict";

import AIPanel from "../src/components/aiPanel.js";

const createPanel = () => {
  const container = {
    innerHTML: "",
    querySelector() {
      return {
        addEventListener() {},
      };
    },
  };

  const store = {
    on() {},
    getStateSummary() {
      return {
        objectCount: 0,
        objects: [],
      };
    },
  };

  return new AIPanel(container, store);
};

test("AIPanel replaces the canvas only for self-contained scenarios", () => {
  const panel = createPanel();

  assert.equal(
    panel.shouldReplaceExistingCanvas({
      actions: [
        { type: "createShape", payload: { shapeType: "circle", properties: {} } },
        { type: "clearSelection", payload: {} },
      ],
    }),
    true
  );

  assert.equal(
    panel.shouldReplaceExistingCanvas({
      actions: [
        { type: "updateObject", payload: { roleLabel: "center-title", properties: { text: "JS" } } },
      ],
    }),
    false
  );
});

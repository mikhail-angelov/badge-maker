import test from "node:test";
import assert from "node:assert/strict";

import { createShapeCommand } from "../src/core/commands/index.js";
import { assertSafeSvgMarkup, sanitizeSvgIcon } from "../src/core/icons/sanitizeSvgIcon.js";
import { normalizeScenario } from "../src/core/scenario/normalizeScenario.js";
import { validateScenario } from "../src/core/scenario/validateScenario.js";
import { formatGenerateSvgRequest } from "../server/prompts/formatGenerateSvgRequest.js";
import { systemSvgPrompt } from "../server/prompts/systemSvgPrompt.js";

const createStore = () => {
  const state = {
    objects: [],
  };

  return {
    getObjects() {
      return state.objects;
    },
    async addShape(shapeType, properties) {
      const object = {
        id: state.objects.length + 1,
        type: shapeType,
        properties: { ...properties },
      };
      state.objects.push(object);
      return object;
    },
  };
};

test("validateScenario accepts image svgPrompt payloads", () => {
  const validation = validateScenario({
    schemaVersion: 1,
    actions: [
      {
        type: "createShape",
        payload: {
          shapeType: "image",
          roleLabel: "center-icon",
          properties: {
            x: 120,
            y: 120,
            width: 96,
            height: 96,
            svgPrompt: "simple police shield with a bold P",
          },
        },
      },
    ],
  });

  assert.equal(validation.ok, true);
});

test("validateScenario accepts image svgMarkup payloads", () => {
  const validation = validateScenario({
    schemaVersion: 1,
    actions: [
      {
        type: "createShape",
        payload: {
          shapeType: "image",
          properties: {
            x: 120,
            y: 120,
            svgMarkup:
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="30"/></svg>',
          },
        },
      },
    ],
  });

  assert.equal(validation.ok, true);
});

test("sanitizeSvgIcon creates a safe SVG data URL", () => {
  const result = sanitizeSvgIcon(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="30" fill="#111111" stroke="#ffcc00"/></svg>'
  );

  assert.equal(result.ok, true);
  assert.match(result.imageSrc, /^data:image\/svg\+xml/);
  assert.match(result.svgMarkup, /fill="#000000"/);
  assert.match(result.svgMarkup, /stroke="#000000"/);
});

test("sanitizeSvgIcon rejects SVG without viewBox", () => {
  const result = sanitizeSvgIcon('<svg xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="30"/></svg>');
  assert.equal(result.ok, false);
  assert.match(result.error, /viewBox/);
});

test("SVG generation prompts require monochrome output", () => {
  assert.match(systemSvgPrompt, /monochrome iconography only/i);
  assert.match(systemSvgPrompt, /black \(#000000\)/i);
  const request = formatGenerateSvgRequest({
    prompt: "simple shield icon with a bold capital P",
  });
  assert.match(request, /monochrome icon only/i);
  assert.match(request, /black \(#000000\)/i);
});

test("normalizeScenario forces generated shape and text colors to black", () => {
  const normalized = normalizeScenario({
    schemaVersion: 1,
    actions: [
      {
        type: "createShape",
        payload: {
          shapeType: "circle",
          properties: { x: 100, y: 100, radius: 40, color: "#17324d" },
        },
      },
      {
        type: "createShape",
        payload: {
          shapeType: "text",
          properties: { x: 100, y: 100, text: "JS", color: "#ffffff" },
        },
      },
      {
        type: "updateObject",
        payload: {
          roleLabel: "badge-title",
          properties: { color: "#ff0000", fillColor: "#00ff00" },
        },
      },
    ],
  });

  assert.equal(normalized.actions[0].payload.properties.color, "#000000");
  assert.equal(normalized.actions[1].payload.properties.color, "#000000");
  assert.equal(normalized.actions[2].payload.properties.color, "#000000");
  assert.equal(normalized.actions[2].payload.properties.fillColor, "#000000");
});

test("assertSafeSvgMarkup rejects unsafe markup", () => {
  assert.throws(
    () => assertSafeSvgMarkup('<svg><script>alert("x")</script></svg>'),
    /unsafe markup/
  );
});

test("createShapeCommand materializes svgMarkup into imageSrc", async () => {
  const store = createStore();

  const result = await createShapeCommand(store, {
    shapeType: "image",
    roleLabel: "center-icon",
    properties: {
      x: 100,
      y: 100,
      svgMarkup:
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 5 L80 20 V48 C80 67 67 83 50 95 C33 83 20 67 20 48 V20 Z"/></svg>',
    },
  });

  assert.equal(result.ok, true);
  assert.equal(store.getObjects()[0].type, "image");
  assert.match(store.getObjects()[0].properties.imageSrc, /^data:image\/svg\+xml/);
  assert.equal(store.getObjects()[0].properties.width, 96);
  assert.equal(store.getObjects()[0].properties.height, 96);
  assert.equal("svgMarkup" in store.getObjects()[0].properties, true);
  assert.equal(store.getObjects()[0].properties.svgMarkup, undefined);
});

import test from "node:test";
import assert from "node:assert/strict";

import { executeScenarioBatch } from "../src/core/commands/executeScenarioBatch.js";
import { buildStateSummary } from "../src/core/roles/buildStateSummary.js";
import { normalizeScenario } from "../src/core/scenario/normalizeScenario.js";
import { validateScenario } from "../src/core/scenario/validateScenario.js";

const createStore = () => {
  const state = {
    objects: [],
    history: [{ action: "init", items: [] }],
  };

  return {
    createSnapshot() {
      return structuredClone(state.objects);
    },
    pushHistoryEntry(action) {
      state.history.push({
        action,
        items: structuredClone(state.objects),
      });
    },
    async addShape(shapeType, properties) {
      const { roleLabel, ...nextProperties } = properties;
      const object = {
        id: state.objects.length + 1,
        type: shapeType,
        properties: { ...nextProperties },
        ...(roleLabel ? { roleLabel } : {}),
      };
      state.objects.push(object);
      return object;
    },
    async updateObjectProps(id, properties) {
      const object = state.objects.find((item) => item.id === id);
      if (!object) {
        return null;
      }
      object.properties = { ...object.properties, ...properties };
      return object;
    },
    async removeObject(id) {
      const index = state.objects.findIndex((item) => item.id === id);
      if (index === -1) {
        return false;
      }
      state.objects.splice(index, 1);
      return true;
    },
    async alignObjectIds() {
      return [];
    },
    async moveToFront() {
      return true;
    },
    async moveToBack() {
      return true;
    },
    async replaceObjects(objects) {
      state.objects = structuredClone(objects);
    },
    setSelectedObjectIds() {},
    cleanAllSelections() {},
    getHistory() {
      return state.history;
    },
    getObjects() {
      return state.objects;
    },
    getState() {
      return state;
    },
  };
};

test("executeScenarioBatch records one undo entry for multiple steps", async () => {
  const store = createStore();

  const result = await executeScenarioBatch(store, {
    schemaVersion: 1,
    actions: [
      {
        type: "createShape",
        payload: {
          shapeType: "rectangle",
          properties: { x: 10, y: 10, width: 40, height: 30 },
        },
      },
      {
        type: "updateObject",
        payload: {
          objectId: 1,
          properties: { x: 20 },
        },
      },
    ],
  }, { historyAction: "batch" });

  assert.equal(result.results.length, 2);
  assert.equal(store.getState().history.length, 2);
  assert.equal(store.getState().history[1].action, "batch");
  assert.equal(store.getState().objects[0].properties.x, 20);
  assert.equal(result.appliedCount, 2);
});

test("executeScenarioBatch can replace the existing canvas before applying a new scenario", async () => {
  const store = createStore();
  store.getState().objects.push({
    id: 7,
    type: "text",
    properties: { x: 0, y: 0, text: "OLD" },
  });

  const result = await executeScenarioBatch(
    store,
    {
      schemaVersion: 1,
      actions: [
        {
          type: "createShape",
          payload: {
            shapeType: "text",
            properties: { x: 10, y: 20, text: "NEW" },
          },
        },
      ],
    },
    { historyAction: "batch", replaceExistingCanvas: true }
  );

  assert.equal(result.ok, true);
  assert.equal(store.getState().objects.length, 1);
  assert.equal(store.getState().objects[0].properties.text, "NEW");
});

test("executeScenarioBatch restores the previous canvas if replacement mode hits a failed step", async () => {
  const store = createStore();
  store.getState().objects.push({
    id: 7,
    type: "text",
    properties: { x: 0, y: 0, text: "OLD" },
  });

  const result = await executeScenarioBatch(
    store,
    {
      schemaVersion: 1,
      actions: [
        {
          type: "createShape",
          payload: {
            shapeType: "text",
            properties: { x: 10, y: 20, text: "NEW" },
          },
        },
        {
          type: "removeObject",
          payload: {
            objectId: 999,
          },
        },
      ],
    },
    { historyAction: "batch", replaceExistingCanvas: true }
  );

  assert.equal(result.ok, false);
  assert.equal(store.getState().objects.length, 1);
  assert.equal(store.getState().objects[0].properties.text, "OLD");
});

test("executeScenarioBatch keeps successful steps when a later step fails", async () => {
  const store = createStore();

  const result = await executeScenarioBatch(store, {
    schemaVersion: 1,
    actions: [
      {
        type: "createShape",
        payload: {
          shapeType: "circle",
          properties: { x: 45, y: 45, radius: 20 },
        },
      },
      {
        type: "removeObject",
        payload: {
          objectId: 999,
        },
      },
    ],
  }, { historyAction: "batch" });

  assert.equal(result.ok, false);
  assert.equal(store.getState().history.length, 2);
  assert.equal(store.getState().objects.length, 1);
  assert.equal(result.results[1].ok, false);
  assert.equal(result.appliedCount, 1);
});

test("executeScenarioBatch warns on unresolved role labels without losing earlier changes", async () => {
  const store = createStore();

  const result = await executeScenarioBatch(
    store,
    {
      schemaVersion: 1,
      actions: [
        {
          type: "createShape",
          payload: {
            shapeType: "text",
            roleLabel: "badge-title",
            properties: { x: 10, y: 10, text: "BADGE" },
          },
        },
        {
          type: "updateObject",
          payload: {
            roleLabel: "missing-label",
            properties: { text: "NEW" },
          },
        },
      ],
    },
    { historyAction: "batch" }
  );

  assert.equal(result.ok, false);
  assert.equal(result.appliedCount, 1);
  assert.equal(result.results[1].code, "role_label_not_found");
  assert.equal(store.getState().objects[0].properties.text, "BADGE");
  assert.equal(store.getState().history.length, 2);
});

test("executeScenarioBatch resolves role labels for follow-up edits", async () => {
  const store = createStore();
  store.getState().objects.push({
    id: 7,
    type: "text",
    roleLabel: "center-title",
    properties: { x: 0, y: 0, text: "OLD" },
  });

  const result = await executeScenarioBatch(store, {
    schemaVersion: 1,
    actions: [
      {
        type: "updateObject",
        payload: {
          roleLabel: "center-title",
          properties: { text: "NEW" },
        },
      },
    ],
  }, { historyAction: "batch" });

  assert.equal(result.ok, true);
  assert.equal(store.getState().objects[0].properties.text, "NEW");
});

test("executeScenarioBatch forces light refinement text colors to black for visibility", async () => {
  const store = createStore();
  store.getState().objects.push({
    id: 7,
    type: "circle-text",
    roleLabel: "ring-text",
    properties: {
      x: 200,
      y: 160,
      radius: 90,
      text: "JAVASCRIPT",
      fontFamily: "Arial",
      fontSize: 18,
      color: "#000000",
    },
  });
  store.getState().objects.push({
    id: 8,
    type: "text",
    roleLabel: "center-text",
    properties: {
      x: 185,
      y: 170,
      text: "JS",
      fontFamily: "Arial",
      fontSize: 32,
      color: "#000000",
    },
  });

  const result = await executeScenarioBatch(store, {
    schemaVersion: 1,
    actions: [
      {
        type: "updateObject",
        payload: {
          roleLabel: "ring-text",
          properties: { color: "#fff" },
        },
      },
      {
        type: "updateObject",
        payload: {
          roleLabel: "center-text",
          properties: { color: "white" },
        },
      },
    ],
  }, { historyAction: "batch" });

  assert.equal(result.ok, true);
  assert.equal(store.getState().objects[0].properties.color, "#000000");
  assert.equal(store.getState().objects[1].properties.color, "#000000");
});

test("executeScenarioBatch persists role labels from createShape payload", async () => {
  const store = createStore();

  const result = await executeScenarioBatch(store, {
    schemaVersion: 1,
    actions: [
      {
        type: "createShape",
        payload: {
          shapeType: "text",
          roleLabel: "badge-title",
          properties: { x: 10, y: 10, text: "BADGE" },
        },
      },
    ],
  }, { historyAction: "batch" });

  assert.equal(result.ok, true);
  assert.equal(store.getState().objects[0].roleLabel, "badge-title");
});

test("executeScenarioBatch sanitizes circle-text geometry before create", async () => {
  const store = createStore();

  const result = await executeScenarioBatch(
    store,
    {
      schemaVersion: 1,
      actions: [
        {
          type: "createShape",
          payload: {
            shapeType: "circle-text",
            roleLabel: "top-text",
            properties: {
              x: 100,
              y: 60,
              width: 200,
              height: 200,
              text: "POLICE",
              fontSize: 20,
            },
          },
        },
      ],
    },
    { historyAction: "batch" }
  );

  assert.equal(result.ok, true);
  assert.equal(store.getState().objects[0].properties.x, 200);
  assert.equal(store.getState().objects[0].properties.y, 160);
  assert.equal(store.getState().objects[0].properties.radius, 90);
  assert.equal("width" in store.getState().objects[0].properties, false);
});

test("executeScenarioBatch rejects infeasible circle-text geometry", async () => {
  const store = createStore();

  const result = await executeScenarioBatch(
    store,
    {
      schemaVersion: 1,
      actions: [
        {
          type: "createShape",
          payload: {
            shapeType: "circle-text",
            roleLabel: "top-text",
            properties: {
              x: 10,
              y: 10,
              radius: 18,
              text: "LONG BADGE TITLE",
              fontSize: 24,
            },
          },
        },
      ],
    },
    { historyAction: "batch" }
  );

  assert.equal(result.ok, false);
  assert.equal(result.results[0].ok, false);
  assert.match(result.results[0].message, /cannot fit/);
});

test("executeScenarioBatch normalizes Deepseek-style circle-text arc fields", async () => {
  const store = createStore();

  const result = await executeScenarioBatch(
    store,
    {
      schemaVersion: 1,
      actions: [
        {
          type: "createShape",
          payload: {
            shapeType: "circle-text",
            roleLabel: "top-text",
            properties: {
              x: 100,
              y: 60,
              radius: 100,
              arcRadius: 100,
              startAngle: 180,
              text: "POLICE",
              fontSize: 24,
            },
          },
        },
      ],
    },
    { historyAction: "batch" }
  );

  assert.equal(result.ok, true);
  assert.equal(store.getState().objects[0].properties.startAngle, 0);
  assert.equal(store.getState().objects[0].properties.radius, 88);
  assert.equal("arcRadius" in store.getState().objects[0].properties, false);
});

test("normalizeScenario infers circle-text geometry between concentric circles", () => {
  const normalized = normalizeScenario({
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
          properties: {
            text: "JAVASCRIPT",
            fontFamily: "Arial",
            fontSize: 18,
          },
        },
      },
    ],
  });

  assert.equal(normalized.actions[2].payload.properties.x, 200);
  assert.equal(normalized.actions[2].payload.properties.y, 160);
  assert.equal(normalized.actions[2].payload.properties.radius, 96);
  assert.equal(normalized.actions[2].payload.properties.innerRadiusHint, 82);
  assert.equal(normalized.actions[2].payload.properties.outerRadiusHint, 110);
});

test("validateScenario accepts circle-text when geometry can be inferred from circles", () => {
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
            text: "JAVASCRIPT",
            fontFamily: "Arial",
            fontSize: 18,
          },
        },
      },
    ],
  });

  assert.equal(validation.ok, true);
  assert.equal(validation.scenario.actions[2].payload.properties.radius, 96);
});

test("normalizeScenario forces light draft text colors to black for visibility", () => {
  const normalized = normalizeScenario({
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
          properties: {
            text: "JAVASCRIPT",
            fontFamily: "Arial",
            fontSize: 18,
            color: "#ffffff",
          },
        },
      },
      {
        type: "createShape",
        payload: {
          shapeType: "text",
          properties: {
            text: "JS",
            fontFamily: "Arial",
            fontSize: 28,
            color: "white",
          },
        },
      },
    ],
  });

  assert.equal(normalized.actions[2].payload.properties.color, "#000000");
  assert.equal(normalized.actions[3].payload.properties.color, "#000000");
  assert.equal(normalized.actions[3].payload.properties.x, 200);
  assert.equal(normalized.actions[3].payload.properties.y, 160);
  assert.equal(normalized.actions[3].payload.properties.textAlign, "center");
  assert.equal(normalized.actions[3].payload.properties.textBaseline, "middle");
});

test("normalizeScenario recenters short text inside the inner circle", () => {
  const normalized = normalizeScenario({
    schemaVersion: 1,
    actions: [
      {
        type: "createShape",
        payload: {
          shapeType: "circle",
          properties: { x: 200, y: 150, radius: 110, color: "#f7df1e" },
        },
      },
      {
        type: "createShape",
        payload: {
          shapeType: "circle",
          properties: { x: 200, y: 150, radius: 82, color: "#1f1f1f" },
        },
      },
      {
        type: "createShape",
        payload: {
          shapeType: "text",
          roleLabel: "center-text",
          properties: {
            x: 185,
            y: 155,
            text: "JS",
            fontFamily: "Arial",
            fontSize: 28,
          },
        },
      },
    ],
  });

  assert.equal(normalized.actions[2].payload.properties.x, 200);
  assert.equal(normalized.actions[2].payload.properties.y, 150);
  assert.equal(normalized.actions[2].payload.properties.textAlign, "center");
  assert.equal(normalized.actions[2].payload.properties.textBaseline, "middle");
});

test("executeScenarioBatch materializes svg markup as image objects", async () => {
  const store = createStore();

  const result = await executeScenarioBatch(
    store,
    {
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
              svgMarkup:
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M50 7 L81 17 V45 C81 66 68 84 50 93 C32 84 19 66 19 45 V17 Z"/></svg>',
            },
          },
        },
      ],
    },
    { historyAction: "batch" }
  );

  assert.equal(result.ok, true);
  assert.match(store.getState().objects[0].properties.imageSrc, /^data:image\/svg\+xml/);
  assert.equal(store.getState().objects[0].properties.width, 96);
  assert.equal(store.getState().objects[0].properties.height, 96);
});

test("executeScenarioBatch accepts circle center-and-radius geometry", async () => {
  const store = createStore();

  const result = await executeScenarioBatch(
    store,
    {
      schemaVersion: 1,
      actions: [
        {
          type: "createShape",
          payload: {
            shapeType: "circle",
            roleLabel: "seal",
            properties: {
              x: 200,
              y: 160,
              radius: 90,
              color: "#17324d",
            },
          },
        },
      ],
    },
    { historyAction: "batch" }
  );

  assert.equal(result.ok, true);
  assert.equal(store.getState().objects[0].properties.x, 200);
  assert.equal(store.getState().objects[0].properties.y, 160);
  assert.equal(store.getState().objects[0].properties.radius, 90);
});

test("validateScenario rejects non-canonical role labels", () => {
  const validation = validateScenario({
    schemaVersion: 1,
    actions: [
      {
        type: "createShape",
        payload: {
          shapeType: "text",
          roleLabel: "Badge Title",
          properties: { x: 1, y: 1, text: "BADGE" },
        },
      },
    ],
  });

  assert.equal(validation.ok, false);
  assert.match(validation.errors[0], /lowercase kebab-case/);
});

test("buildStateSummary excludes raw ids and includes selection labels", () => {
  const summary = buildStateSummary({
    objects: [
      {
        id: 1,
        type: "text",
        roleLabel: "badge-title",
        properties: { x: 10, y: 20, text: "BADGE" },
      },
      {
        id: 2,
        type: "image",
        roleLabel: "center-icon",
        properties: {
          x: 50,
          y: 60,
          width: 96,
          height: 96,
          imageSrc: "data:image/svg+xml;charset=utf-8,%3Csvg%3E",
        },
      },
    ],
    selectedObjectIds: [1],
    activeObjectId: 1,
  });

  assert.equal(summary.objectCount, 2);
  assert.deepEqual(summary.availableRoleLabels, ["badge-title", "center-icon"]);
  assert.equal(summary.activeRoleLabel, "badge-title");
  assert.deepEqual(summary.selectedRoleLabels, ["badge-title"]);
  assert.equal("id" in summary.objects[0], false);
  assert.match(summary.objects[0].summary, /BADGE/);
  assert.equal(summary.objects[0].stackIndex, 0);
  assert.deepEqual(summary.objects[0].geometry, {
    x: 10,
    y: 20,
    fontSize: null,
  });
  assert.equal(summary.objects[1].sourceKind, "embedded-svg");
  assert.equal("imageSrc" in summary.objects[1].properties, false);
});

test("executeScenarioBatch warns when align roleLabels contain a missing target", async () => {
  const store = createStore();
  store.getState().objects.push({
    id: 1,
    type: "text",
    roleLabel: "badge-title",
    properties: { x: 10, y: 10, text: "BADGE" },
  });

  const result = await executeScenarioBatch(
    store,
    {
      schemaVersion: 1,
      actions: [
        {
          type: "alignObjects",
          payload: {
            roleLabels: ["badge-title", "missing-label"],
            alignment: "center-horizontal",
          },
        },
      ],
    },
    { historyAction: "batch" }
  );

  assert.equal(result.ok, false);
  assert.equal(result.appliedCount, 0);
  assert.equal(result.results[0].code, "role_labels_not_found");
  assert.equal(store.getState().history.length, 1);
});

test("validateScenario rejects circles without usable geometry", () => {
  const validation = validateScenario({
    schemaVersion: 1,
    actions: [
      {
        type: "createShape",
        payload: {
          shapeType: "circle",
          properties: {
            color: "#17324d",
          },
        },
      },
    ],
  });

  assert.equal(validation.ok, false);
  assert.match(validation.errors[0], /radius/);
});

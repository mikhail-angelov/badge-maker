import test from "node:test";
import assert from "node:assert/strict";

globalThis.document = {
  createElement() {
    return {
      innerHTML: "",
      style: {},
      offsetHeight: 24,
    };
  },
  body: {
    appendChild() {},
  },
};

globalThis.Image = class {
  constructor() {
    this.src = "";
  }
};

const waitForStoreInit = async (store) => {
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (store.collection?.initPromise) {
    await store.collection.initPromise;
  }
};

const createMemoryDb = () => {
  let items = [];

  return {
    async initDB() {},
    async loadObjects() {
      return structuredClone(items);
    },
    async saveObject(object) {
      const index = items.findIndex((item) => item.id === object.id);
      if (index === -1) {
        items.push(structuredClone(object));
      } else {
        items[index] = structuredClone(object);
      }
    },
    async deleteObject(id) {
      items = items.filter((item) => item.id !== id);
    },
    async deleteAllObjects() {
      items = [];
    },
  };
};

test("Store restores the full pre-scenario canvas with one undo after partial batch execution", async () => {
  const { default: Store } = await import("../src/store/store.js");
  const { executeScenarioBatch } = await import("../src/core/commands/executeScenarioBatch.js");

  const store = new Store(createMemoryDb());
  await waitForStoreInit(store);

  await store.addShape("text", {
    x: 20,
    y: 20,
    text: "BADGE",
    roleLabel: "badge-title",
  });

  const beforeScenario = store.createSnapshot();
  const beforeScenarioHistoryIndex = store.getHistoryIndex();

  const result = await executeScenarioBatch(
    store,
    {
      schemaVersion: 1,
      actions: [
        {
          type: "updateObject",
          payload: {
            roleLabel: "badge-title",
            properties: { text: "SHERIFF" },
          },
        },
        {
          type: "updateObject",
          payload: {
            roleLabel: "missing-label",
            properties: { text: "IGNORED" },
          },
        },
      ],
    },
    { historyAction: "scenario" }
  );

  assert.equal(result.ok, false);
  assert.equal(store.getObjects()[0].properties.text, "SHERIFF");
  assert.equal(store.getHistory().length, 4);

  await store.restoreFromHistory(beforeScenarioHistoryIndex);

  assert.deepEqual(store.createSnapshot(), beforeScenario);
  assert.equal(store.getObjects()[0].properties.text, "BADGE");
});

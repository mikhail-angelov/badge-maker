import {
  alignObjectsCommand,
  clearSelectionCommand,
  createShapeCommand,
  moveToBackCommand,
  moveToFrontCommand,
  removeObjectCommand,
  replaceCanvasCommand,
  selectObjectsCommand,
  updateObjectCommand,
} from "./index.js";
import { capturePreBatchSnapshot, commitBatchHistory } from "./historyBatch.js";
import { resolveRoleLabel, resolveRoleLabels } from "../roles/resolveRoleLabel.js";
import { normalizeTextColor } from "../scenario/normalizeScenario.js";
import { validateScenario } from "../scenario/validateScenario.js";

const commandMap = {
  createShape: createShapeCommand,
  updateObject: updateObjectCommand,
  removeObject: removeObjectCommand,
  alignObjects: alignObjectsCommand,
  moveToFront: moveToFrontCommand,
  moveToBack: moveToBackCommand,
  replaceCanvas: replaceCanvasCommand,
  selectObjects: selectObjectsCommand,
  clearSelection: clearSelectionCommand,
};

const buildFailureResult = ({
  command,
  message,
  stepIndex,
  label = null,
  code = "command_failed",
  details = {},
}) => ({
  ok: false,
  severity: "warning",
  command,
  code,
  message,
  stepIndex,
  label,
  details,
});

const resolvePayloadTargets = (store, action, stepIndex) => {
  const payload = structuredClone(action.payload || {});
  const { type } = action;

  if (["updateObject", "removeObject", "moveToFront", "moveToBack"].includes(type)) {
    if (payload.objectId != null) {
      return { ok: true, payload };
    }

    if (payload.roleLabel) {
      const object = resolveRoleLabel(store.getObjects(), payload.roleLabel);
      if (!object) {
        return {
          ok: false,
          result: buildFailureResult({
            command: type,
            code: "role_label_not_found",
            message: `Role label "${payload.roleLabel}" could not be resolved`,
            stepIndex,
            label: action.label || null,
            details: { roleLabel: payload.roleLabel },
          }),
        };
      }
      payload.objectId = object.id;
    }
  }

  if (type === "updateObject" && payload.objectId != null && payload.properties) {
    const currentObject = store.getObjects().find((item) => item.id === payload.objectId);
    if (currentObject && ["text", "circle-text"].includes(currentObject.type)) {
      payload.properties = normalizeTextColor(payload.properties);
    }
  }

  if (["alignObjects", "selectObjects"].includes(type) && !payload.objectIds?.length) {
    const { resolvedObjects, missingRoleLabels } = resolveRoleLabels(
      store.getObjects(),
      payload.roleLabels || []
    );

    if (missingRoleLabels.length > 0) {
      return {
        ok: false,
        result: buildFailureResult({
          command: type,
          code: "role_labels_not_found",
          message: `Role labels could not be resolved: ${missingRoleLabels.join(", ")}`,
          stepIndex,
          label: action.label || null,
          details: { roleLabels: missingRoleLabels },
        }),
      };
    }

    payload.objectIds = resolvedObjects.map((object) => object.id);
  }

  if (type === "selectObjects" && payload.activeObjectId == null && payload.activeRoleLabel) {
    const object = resolveRoleLabel(store.getObjects(), payload.activeRoleLabel);
    if (!object) {
      return {
        ok: false,
        result: buildFailureResult({
          command: type,
          code: "active_role_label_not_found",
          message: `Active role label "${payload.activeRoleLabel}" could not be resolved`,
          stepIndex,
          label: action.label || null,
          details: { roleLabel: payload.activeRoleLabel },
        }),
      };
    }
    payload.activeObjectId = object.id;
  }

  return { ok: true, payload };
};

export const executeScenarioBatch = async (
  store,
  scenario,
  {
    historyAction = "scenario",
    confirmedReplaceCanvas = false,
    replaceExistingCanvas = false,
  } = {}
) => {
  const validation = validateScenario(scenario);
  if (!validation.ok) {
    return {
      ok: false,
      appliedCount: 0,
      failedCount: validation.errors.length,
      results: validation.errors.map((message, stepIndex) =>
        buildFailureResult({
          command: "validateScenario",
          message,
          stepIndex,
          code: "scenario_validation_failed",
        })
      ),
    };
  }

  const preBatchSnapshot = capturePreBatchSnapshot(store);
  if (replaceExistingCanvas) {
    await store.replaceObjects([], {
      recordHistory: false,
      emitStateChange: false,
    });
  }
  const results = [];
  let appliedCount = 0;

  for (const [stepIndex, action] of validation.scenario.actions.entries()) {
    const command = commandMap[action.type];
    if (!command) {
      results.push({
        ok: false,
        command: action.type,
        message: `Unsupported action type: ${action.type}`,
        stepIndex,
      });
      continue;
    }

    const resolvedPayload = resolvePayloadTargets(store, action, stepIndex);
    if (!resolvedPayload.ok) {
      results.push(resolvedPayload.result);
      continue;
    }

    const payload =
      action.type === "replaceCanvas"
        ? {
            ...resolvedPayload.payload,
            confirmed: resolvedPayload.payload.confirmed || confirmedReplaceCanvas,
          }
        : resolvedPayload.payload;

    const result = await command(store, payload);
    results.push(
      result.ok
        ? { ...result, stepIndex, label: action.label || null }
        : buildFailureResult({
            command: result.command || action.type,
            message: result.message,
            stepIndex,
            label: action.label || null,
            details: {
              payload,
            },
          })
    );
    if (result.ok) {
      appliedCount += 1;
    }
  }

  if (replaceExistingCanvas && results.some((result) => !result.ok)) {
    await store.replaceObjects(preBatchSnapshot, {
      recordHistory: false,
      emitStateChange: true,
    });

    return {
      ok: false,
      appliedCount: 0,
      failedCount: results.filter((result) => !result.ok).length,
      results,
    };
  }

  if (appliedCount > 0) {
    commitBatchHistory(store, historyAction);
  }

  return {
    ok: results.every((result) => result.ok),
    appliedCount,
    failedCount: results.length - appliedCount,
    results,
  };
};

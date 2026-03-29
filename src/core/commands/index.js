import { sanitizeCircleTextGeometry } from "../fitting/sanitizeCircleTextGeometry.js";
import { sanitizeSvgIcon } from "../icons/sanitizeSvgIcon.js";
import { canonicalizeRoleLabel, normalizeRoleLabel } from "../roles/normalizeRoleLabel.js";

const ok = (command, extra = {}) => ({ ok: true, command, ...extra });
const fail = (command, message, extra = {}) => ({
  ok: false,
  command,
  message,
  ...extra,
});

const normalizeArgs = (storeOrInput, payload) =>
  payload === undefined ? storeOrInput : { store: storeOrInput, ...payload };

const getExistingRoleLabels = (store, excludeObjectId = null) =>
  store
    .getObjects()
    .filter((object) => object.id !== excludeObjectId)
    .map((object) => object.roleLabel)
    .filter(Boolean);

const canonicalizeImportedObjects = (objects) => {
  const existingRoleLabels = [];

  return objects.map((object) => {
    if (!object.roleLabel) {
      return object;
    }

    const roleLabel = canonicalizeRoleLabel(object.roleLabel, existingRoleLabels);
    if (roleLabel) {
      existingRoleLabels.push(roleLabel);
    }

    return {
      ...object,
      roleLabel,
    };
  });
};

const sanitizeImageProperties = (properties) => {
  if (!properties?.svgMarkup) {
    return {
      ok: true,
      properties,
    };
  }

  const sanitizedSvg = sanitizeSvgIcon(properties.svgMarkup);
  if (!sanitizedSvg.ok) {
    return sanitizedSvg;
  }

  return {
    ok: true,
    properties: {
      ...properties,
      imageSrc: sanitizedSvg.imageSrc,
      width: Number.isFinite(properties.width) ? properties.width : 96,
      height: Number.isFinite(properties.height) ? properties.height : 96,
      svgMarkup: undefined,
    },
  };
};

const sanitizeShapeProperties = ({ shapeType, currentType = null, properties }) => {
  const effectiveType = shapeType || currentType;
  if (effectiveType === "circle-text") {
    return sanitizeCircleTextGeometry(properties);
  }

  if (effectiveType === "image") {
    return sanitizeImageProperties(properties);
  }

  return {
    ok: true,
    properties,
  };
};

export const createShapeCommand = async (storeOrInput, payload) => {
  const {
    store,
    shapeType,
    properties = {},
    roleLabel,
    options = {},
  } = normalizeArgs(
    storeOrInput,
    payload
  );

  try {
    const sanitized = sanitizeShapeProperties({ shapeType, properties });
    if (!sanitized.ok) {
      return fail("createShape", sanitized.error, { fit: sanitized.fit });
    }
    const existingRoleLabels = getExistingRoleLabels(store);
    const canonicalRoleLabel = canonicalizeRoleLabel(
      roleLabel || properties.roleLabel,
      existingRoleLabels
    );
    const shape = await store.addShape(
      shapeType,
      {
        ...sanitized.properties,
        ...(canonicalRoleLabel ? { roleLabel: canonicalRoleLabel } : {}),
      },
      options
    );
    return ok("createShape", { objectId: shape.id, object: shape });
  } catch (error) {
    return fail("createShape", error.message);
  }
};

export const updateObjectCommand = async (storeOrInput, payload) => {
  const {
    store,
    objectId,
    properties = {},
    nextRoleLabel,
    options = {},
  } = normalizeArgs(storeOrInput, payload);
  const normalizedNextRoleLabel = normalizeRoleLabel(nextRoleLabel);
  const roleLabel = normalizedNextRoleLabel
    ? canonicalizeRoleLabel(
        normalizedNextRoleLabel,
        getExistingRoleLabels(store, objectId)
      )
    : undefined;
  const currentObject = store.getObjectById ? store.getObjectById(objectId) : null;
  const sanitized = sanitizeShapeProperties({
    currentType: currentObject?.type || null,
    properties: {
      ...(currentObject?.properties || {}),
      ...properties,
    },
  });
  if (!sanitized.ok) {
    return fail("updateObject", sanitized.error, { objectId, fit: sanitized.fit });
  }
  const updatedObject = store.updateObject
    ? await store.updateObject(
        objectId,
        {
          ...(roleLabel === undefined ? {} : { roleLabel }),
          properties: sanitized.properties,
        },
        options
      )
    : await store.updateObjectProps(objectId, sanitized.properties, options);

  if (!updatedObject) {
    return fail("updateObject", `Object ${objectId} was not found`, { objectId });
  }

  return ok("updateObject", { objectId, object: updatedObject });
};

export const removeObjectCommand = async (storeOrInput, payload) => {
  const { store, objectId, options = {} } = normalizeArgs(storeOrInput, payload);
  const removed = await store.removeObject(objectId, options);
  return removed
    ? ok("removeObject", { objectId })
    : fail("removeObject", `Object ${objectId} was not found`, { objectId });
};

export const alignObjectsCommand = async (storeOrInput, payload) => {
  const { store, objectIds = [], alignment, options = {} } = normalizeArgs(
    storeOrInput,
    payload
  );
  const updatedObjects = await store.alignObjectIds(objectIds, alignment, options);

  return updatedObjects.length > 0
    ? ok("alignObjects", { objectIds, alignment, updatedObjects })
    : fail("alignObjects", "At least one object is required for alignment", {
        objectIds,
        alignment,
      });
};

export const moveToFrontCommand = async (storeOrInput, payload) => {
  const { store, objectId, options = {} } = normalizeArgs(storeOrInput, payload);
  const moved = await store.moveToFront(objectId, options);
  return moved
    ? ok("moveToFront", { objectId })
    : fail("moveToFront", `Object ${objectId} was not found`, { objectId });
};

export const moveToBackCommand = async (storeOrInput, payload) => {
  const { store, objectId, options = {} } = normalizeArgs(storeOrInput, payload);
  const moved = await store.moveToBack(objectId, options);
  return moved
    ? ok("moveToBack", { objectId })
    : fail("moveToBack", `Object ${objectId} was not found`, { objectId });
};

export const replaceCanvasCommand = async (storeOrInput, payload) => {
  const {
    store,
    objects = [],
    confirmed = false,
    reason = "update",
    options = {},
  } = normalizeArgs(storeOrInput, payload);

  if (!confirmed) {
    return fail(
      "replaceCanvas",
      "replaceCanvas requires explicit confirmation before execution"
    );
  }

  const canonicalObjects = canonicalizeImportedObjects(objects);
  await store.replaceObjects(canonicalObjects, {
    ...options,
    historyAction: options.historyAction || reason,
  });
  return ok("replaceCanvas", { objectCount: canonicalObjects.length });
};

export const selectObjectsCommand = (storeOrInput, payload) => {
  const {
    store,
    objectIds = [],
    activeObjectId = null,
    offset = {},
  } = normalizeArgs(storeOrInput, payload);

  if (activeObjectId != null) {
    const activeObject = store.getObjectById(activeObjectId);
    if (!activeObject) {
      return fail("selectObjects", `Object ${activeObjectId} was not found`, {
        activeObjectId,
      });
    }
    store.setActiveObject(activeObject, offset);
    return ok("selectObjects", { objectIds: [activeObjectId], activeObjectId });
  }

  store.setSelectedObjectIds(objectIds);
  return ok("selectObjects", { objectIds });
};

export const clearSelectionCommand = (storeOrInput) => {
  const { store } = normalizeArgs(storeOrInput);
  store.cleanAllSelections();
  return ok("clearSelection");
};

export default {
  alignObjectsCommand,
  clearSelectionCommand,
  createShapeCommand,
  moveToBackCommand,
  moveToFrontCommand,
  removeObjectCommand,
  replaceCanvasCommand,
  selectObjectsCommand,
  updateObjectCommand,
};

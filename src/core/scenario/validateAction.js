import {
  ALLOWED_ACTION_TYPES,
  ALLOWED_ALIGNMENT_TYPES,
  ALLOWED_CIRCLE_TEXT_LAYOUT_MODES,
  ALLOWED_FONTS,
  ALLOWED_SHAPE_TYPES,
  ALLOWED_TEXT_ANCHORS,
} from "./schema.js";
import { normalizeRoleLabel } from "../roles/normalizeRoleLabel.js";
import { sanitizeCircleTextGeometry } from "../fitting/sanitizeCircleTextGeometry.js";

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const hasFiniteProperties = (properties, keys) =>
  keys.every((key) => isFiniteNumber(properties?.[key]));
const formatDisplayNumber = (value) =>
  Number.isInteger(value) ? String(value) : String(Math.round(value * 10) / 10);

const validateProperties = (properties, errors, path) => {
  if (!properties || typeof properties !== "object" || Array.isArray(properties)) {
    errors.push(`${path} must be an object`);
    return;
  }

  for (const [key, value] of Object.entries(properties)) {
    if (["x", "y", "width", "height", "radius", "fontSize"].includes(key)) {
      if (!isFiniteNumber(value)) {
        errors.push(`${path}.${key} must be a finite number`);
      } else if (Math.abs(value) > 10000) {
        errors.push(`${path}.${key} is out of bounds`);
      }
    }

    if (key === "fontFamily" && value && !ALLOWED_FONTS.includes(value)) {
      errors.push(`${path}.fontFamily must be one of: ${ALLOWED_FONTS.join(", ")}`);
    }

    if (key === "layoutMode" && value && !ALLOWED_CIRCLE_TEXT_LAYOUT_MODES.includes(value)) {
      errors.push(
        `${path}.layoutMode must be one of: ${ALLOWED_CIRCLE_TEXT_LAYOUT_MODES.join(", ")}`
      );
    }

    if (key === "anchor" && value && !ALLOWED_TEXT_ANCHORS.includes(value)) {
      errors.push(`${path}.anchor must be one of: ${ALLOWED_TEXT_ANCHORS.join(", ")}`);
    }

    if (key === "imageSrc" && value != null && !isNonEmptyString(value)) {
      errors.push(`${path}.imageSrc must be a non-empty string`);
    }

    if (key === "svgPrompt" && value != null && !isNonEmptyString(value)) {
      errors.push(`${path}.svgPrompt must be a non-empty string`);
    }

    if (key === "svgMarkup" && value != null && !isNonEmptyString(value)) {
      errors.push(`${path}.svgMarkup must be a non-empty string`);
    }
  }
};

const validateIdArray = (value, errors, path) => {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${path} must be a non-empty array`);
    return;
  }

  value.forEach((item, index) => {
    if (typeof item !== "number") {
      errors.push(`${path}[${index}] must be a number`);
    }
  });
};

const validateRoleLabel = (value, errors, path) => {
  if (!isNonEmptyString(value)) {
    errors.push(`${path} must be a non-empty string`);
    return;
  }

  if (normalizeRoleLabel(value) !== value) {
    errors.push(`${path} must be lowercase kebab-case`);
  }
};

const validateTargetReference = (payload, errors, path) => {
  if (typeof payload.objectId === "number") {
    return;
  }
  if (isNonEmptyString(payload.roleLabel)) {
    return;
  }
  errors.push(`${path} must include objectId or roleLabel`);
};

const validateTargetArray = (payload, errors, path) => {
  if (Array.isArray(payload.objectIds) && payload.objectIds.length > 0) {
    validateIdArray(payload.objectIds, errors, `${path}.objectIds`);
    return;
  }
  if (Array.isArray(payload.roleLabels) && payload.roleLabels.length > 0) {
    payload.roleLabels.forEach((roleLabel, index) => {
      validateRoleLabel(roleLabel, errors, `${path}.roleLabels[${index}]`);
    });
    return;
  }
  errors.push(`${path} must include objectIds or roleLabels`);
};

const hasStandaloneCircleTextGeometry = (properties = {}) =>
  hasFiniteProperties(properties, ["x", "y"]) &&
  isNonEmptyString(properties.text) &&
  (isFiniteNumber(properties.radius) || hasFiniteProperties(properties, ["width", "height"]));

const validateCircleTextLayoutQuality = (properties, errors, warnings, path) => {
  if (!hasStandaloneCircleTextGeometry(properties)) {
    return;
  }

  const requestedLayoutMode = properties.layoutMode;
  const requestedFontSize = properties.fontSize;
  const requestedRadius = properties.radius;
  const sanitization = sanitizeCircleTextGeometry(properties);

  if (!sanitization.ok) {
    errors.push(`${path} ${sanitization.error}`);
    return;
  }

  const { properties: sanitizedProperties, fit } = sanitization;

  if (
    requestedLayoutMode === "top-arc" &&
    sanitizedProperties.layoutMode &&
    sanitizedProperties.layoutMode !== requestedLayoutMode
  ) {
    warnings.push(
      `${path}.layoutMode "${requestedLayoutMode}" is too cramped and would be widened to "${sanitizedProperties.layoutMode}" before apply`
    );
  }

  if (
    isFiniteNumber(requestedFontSize) &&
    isFiniteNumber(sanitizedProperties.fontSize) &&
    sanitizedProperties.fontSize < requestedFontSize
  ) {
    warnings.push(
      `${path}.fontSize would shrink from ${requestedFontSize} to ${sanitizedProperties.fontSize} to keep ring text readable`
    );
  }

  if (
    isFiniteNumber(requestedRadius) &&
    isFiniteNumber(sanitizedProperties.radius) &&
    Math.abs(sanitizedProperties.radius - requestedRadius) >= 2
  ) {
    warnings.push(
      `${path}.radius would shift from ${formatDisplayNumber(requestedRadius)} to ${formatDisplayNumber(sanitizedProperties.radius)} to stay inside the ring`
    );
  }

  if (fit?.status === "tight_fit") {
    warnings.push(`${path} is a tight fit and may still look cramped in the preview`);
  }
};

export const validateAction = (action, index) => {
  const errors = [];
  const warnings = [];
  const path = `actions[${index}]`;

  if (!action || typeof action !== "object" || Array.isArray(action)) {
    return {
      errors: [`${path} must be an object`],
      warnings,
    };
  }

  if (!ALLOWED_ACTION_TYPES.includes(action.type)) {
    errors.push(`${path}.type must be one of: ${ALLOWED_ACTION_TYPES.join(", ")}`);
  }

  const payload = action.payload || {};
  if (action.type !== "clearSelection" && (!payload || typeof payload !== "object")) {
    errors.push(`${path}.payload must be an object`);
    return errors;
  }

  switch (action.type) {
    case "createShape":
      if (!ALLOWED_SHAPE_TYPES.includes(payload.shapeType)) {
        errors.push(`${path}.payload.shapeType must be one of: ${ALLOWED_SHAPE_TYPES.join(", ")}`);
      }
      if (payload.roleLabel != null) {
        validateRoleLabel(payload.roleLabel, errors, `${path}.payload.roleLabel`);
      }
      validateProperties(payload.properties, errors, `${path}.payload.properties`);
      if (
        payload.shapeType === "image" &&
        !isNonEmptyString(payload.properties?.imageSrc) &&
        !isNonEmptyString(payload.properties?.svgPrompt) &&
        !isNonEmptyString(payload.properties?.svgMarkup)
      ) {
        errors.push(`${path}.payload.properties must include imageSrc, svgPrompt, or svgMarkup`);
      }
      if (
        payload.shapeType !== "image" &&
        (payload.properties?.svgPrompt || payload.properties?.svgMarkup)
      ) {
        errors.push(`${path}.payload.properties.svgPrompt/svgMarkup is only allowed for image shapes`);
      }
      if (
        payload.shapeType === "rectangle" &&
        !hasFiniteProperties(payload.properties, ["x", "y", "width", "height"])
      ) {
        errors.push(`${path}.payload.properties must include x, y, width, and height for rectangles`);
      }
      if (
        payload.shapeType === "circle" &&
        !(
          hasFiniteProperties(payload.properties, ["x", "y", "radius"]) ||
          hasFiniteProperties(payload.properties, ["x", "y", "width", "height"])
        )
      ) {
        errors.push(
          `${path}.payload.properties must include x, y, and radius or x, y, width, and height for circles`
        );
      }
      if (
        payload.shapeType === "image" &&
        !hasFiniteProperties(payload.properties, ["x", "y"])
      ) {
        errors.push(`${path}.payload.properties must include x and y for images`);
      }
      if (
        payload.shapeType === "text" &&
        (!hasFiniteProperties(payload.properties, ["x", "y"]) ||
          !isNonEmptyString(payload.properties?.text))
      ) {
        errors.push(`${path}.payload.properties must include x, y, and text for text shapes`);
      }
      if (
        payload.shapeType === "circle-text" &&
        (!hasFiniteProperties(payload.properties, ["x", "y"]) ||
          !isNonEmptyString(payload.properties?.text) ||
          !(
            isFiniteNumber(payload.properties?.radius) ||
            hasFiniteProperties(payload.properties, ["width", "height"])
          ))
      ) {
        errors.push(
          `${path}.payload.properties must include x, y, text, and radius or width and height for circle-text shapes`
        );
      }
      if (payload.shapeType === "circle-text") {
        validateCircleTextLayoutQuality(
          payload.properties,
          errors,
          warnings,
          `${path}.payload.properties`
        );
      }
      break;
    case "updateObject":
      validateTargetReference(payload, errors, `${path}.payload`);
      if (payload.nextRoleLabel != null) {
        validateRoleLabel(payload.nextRoleLabel, errors, `${path}.payload.nextRoleLabel`);
      }
      validateProperties(payload.properties, errors, `${path}.payload.properties`);
      validateCircleTextLayoutQuality(
        payload.properties,
        errors,
        warnings,
        `${path}.payload.properties`
      );
      break;
    case "removeObject":
    case "moveToFront":
    case "moveToBack":
      validateTargetReference(payload, errors, `${path}.payload`);
      break;
    case "alignObjects":
      validateTargetArray(payload, errors, `${path}.payload`);
      if (!ALLOWED_ALIGNMENT_TYPES.includes(payload.alignment)) {
        errors.push(
          `${path}.payload.alignment must be one of: ${ALLOWED_ALIGNMENT_TYPES.join(", ")}`
        );
      }
      break;
    case "replaceCanvas":
      if (!Array.isArray(payload.objects)) {
        errors.push(`${path}.payload.objects must be an array`);
      }
      break;
    case "selectObjects":
      validateTargetArray(payload, errors, `${path}.payload`);
      if (payload.activeObjectId != null && typeof payload.activeObjectId !== "number") {
        errors.push(`${path}.payload.activeObjectId must be a number when provided`);
      }
      if (payload.activeRoleLabel != null) {
        validateRoleLabel(payload.activeRoleLabel, errors, `${path}.payload.activeRoleLabel`);
      }
      break;
    default:
      break;
  }

  return {
    errors,
    warnings,
  };
};

import { sanitizeCircleTextGeometry } from "../../src/core/fitting/sanitizeCircleTextGeometry.js";
import { ALLOWED_FONTS } from "../../src/core/scenario/schema.js";
import { normalizeScenario } from "../../src/core/scenario/normalizeScenario.js";
import { validateScenario } from "../../src/core/scenario/validateScenario.js";

const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const isNonEmptyString = (value) => typeof value === "string" && value.trim().length > 0;
const hasStandaloneCircleTextGeometry = (properties = {}) =>
  isFiniteNumber(properties.x) &&
  isFiniteNumber(properties.y) &&
  isNonEmptyString(properties.text) &&
  (isFiniteNumber(properties.radius) ||
    (isFiniteNumber(properties.width) && isFiniteNumber(properties.height)));

const chooseSafeFont = (fontFamily) => {
  if (!isNonEmptyString(fontFamily)) {
    return fontFamily;
  }

  if (ALLOWED_FONTS.includes(fontFamily)) {
    return fontFamily;
  }

  return /courier|mono|type/i.test(fontFamily) ? "Courier New" : "Arial";
};

const pushWarning = (warnings, message) => {
  if (!warnings.includes(message)) {
    warnings.push(message);
  }
};

const refineFontFamily = (properties = {}, actionPath, warnings) => {
  if (!isNonEmptyString(properties.fontFamily)) {
    return properties;
  }

  const safeFontFamily = chooseSafeFont(properties.fontFamily);
  if (safeFontFamily === properties.fontFamily) {
    return properties;
  }

  pushWarning(
    warnings,
    `${actionPath}.fontFamily "${properties.fontFamily}" was replaced with "${safeFontFamily}" to stay within MVP-safe fonts`
  );

  return {
    ...properties,
    fontFamily: safeFontFamily,
  };
};

const refineCircleTextProperties = (properties = {}, actionPath, warnings) => {
  if (!hasStandaloneCircleTextGeometry(properties)) {
    return properties;
  }

  const sanitized = sanitizeCircleTextGeometry(properties);
  if (!sanitized.ok) {
    return properties;
  }

  const nextProperties = sanitized.properties;

  if (properties.layoutMode && nextProperties.layoutMode !== properties.layoutMode) {
    pushWarning(
      warnings,
      `${actionPath}.layoutMode was widened from "${properties.layoutMode}" to "${nextProperties.layoutMode}" to fit the requested ring text`
    );
  }

  if (
    isFiniteNumber(properties.fontSize) &&
    isFiniteNumber(nextProperties.fontSize) &&
    nextProperties.fontSize !== properties.fontSize
  ) {
    pushWarning(
      warnings,
      `${actionPath}.fontSize was adjusted from ${properties.fontSize} to ${nextProperties.fontSize} to keep the ring text drawable`
    );
  }

  if (
    isFiniteNumber(properties.radius) &&
    isFiniteNumber(nextProperties.radius) &&
    nextProperties.radius !== properties.radius
  ) {
    pushWarning(
      warnings,
      `${actionPath}.radius was adjusted from ${properties.radius} to ${nextProperties.radius} to keep the ring text inside its band`
    );
  }

  return nextProperties;
};

export const refineScenario = (scenario) => {
  const warnings = [];
  const normalizedScenario = normalizeScenario(scenario);
  const nextScenario = structuredClone(normalizedScenario);

  nextScenario.actions = (nextScenario.actions || []).map((action, index) => {
    if (!action?.payload?.properties) {
      return action;
    }

    const actionPath = `actions[${index}].payload.properties`;
    let nextProperties = refineFontFamily(action.payload.properties, actionPath, warnings);

    if (
      action.type === "createShape" &&
      action.payload.shapeType === "circle-text"
    ) {
      nextProperties = refineCircleTextProperties(nextProperties, actionPath, warnings);
    }

    return {
      ...action,
      payload: {
        ...action.payload,
        properties: nextProperties,
      },
    };
  });

  const validation = validateScenario(nextScenario);
  if (!validation.ok) {
    const error = new Error(validation.errors.join("; "));
    error.statusCode = 422;
    error.validation = validation;
    throw error;
  }

  return {
    scenario: structuredClone(nextScenario),
    warnings: [...new Set([...warnings, ...validation.warnings])],
  };
};

export default refineScenario;

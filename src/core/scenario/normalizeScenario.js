const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const LIGHT_TEXT_COLORS = new Set(["white", "#ffffff", "#fff", "rgb(255,255,255)"]);
const FORCED_BLACK_COLOR_FIELDS = [
  "color",
  "fillColor",
  "strokeColor",
  "primaryColor",
  "secondaryColor",
  "accentColor",
  "letterColor",
];

const isLightColor = (value) => {
  if (typeof value !== "string") {
    return false;
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, "");
  if (LIGHT_TEXT_COLORS.has(normalized)) {
    return true;
  }

  const match = normalized.match(/^#([0-9a-f]{6})$/i);
  if (!match) {
    return false;
  }

  const hex = match[1];
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 220;
};

export const normalizeTextColor = (properties = {}) => {
  const nextProperties = normalizeGeneratedColors(properties);
  if (!nextProperties.color || isLightColor(nextProperties.color)) {
    nextProperties.color = "#000000";
  }
  if (nextProperties.fillColor && isLightColor(nextProperties.fillColor)) {
    nextProperties.fillColor = "#000000";
  }
  return nextProperties;
};

export const normalizeGeneratedColors = (properties = {}) => {
  const nextProperties = { ...properties };

  for (const field of FORCED_BLACK_COLOR_FIELDS) {
    if (field in nextProperties && nextProperties[field] != null) {
      nextProperties[field] = "#000000";
    }
  }

  return nextProperties;
};

const getCircleGeometry = (properties = {}) => {
  if (
    isFiniteNumber(properties.x) &&
    isFiniteNumber(properties.y) &&
    isFiniteNumber(properties.radius)
  ) {
    return {
      x: properties.x,
      y: properties.y,
      radius: Math.abs(properties.radius),
    };
  }

  if (
    isFiniteNumber(properties.x) &&
    isFiniteNumber(properties.y) &&
    isFiniteNumber(properties.width) &&
    isFiniteNumber(properties.height)
  ) {
    return {
      x: properties.x + properties.width / 2,
      y: properties.y + properties.height / 2,
      radius: Math.min(Math.abs(properties.width), Math.abs(properties.height)) / 2,
    };
  }

  return null;
};

const getCircleBand = (circles = []) => {
  if (circles.length < 2) {
    return null;
  }

  const sortedCircles = [...circles].sort((a, b) => b.radius - a.radius);
  return {
    outer: sortedCircles[0],
    inner: sortedCircles[1],
  };
};

const inferCircleTextGeometry = (properties = {}, circles = []) => {
  const normalizedProperties = normalizeTextColor(properties);
  const circleBand = getCircleBand(circles);
  const nextProperties = {
    ...normalizedProperties,
    layoutMode: normalizedProperties.layoutMode || "top-arc",
    ...(circleBand
      ? {
          innerRadiusHint: circleBand.inner.radius,
          outerRadiusHint: circleBand.outer.radius,
        }
      : {}),
  };

  if (
    isFiniteNumber(nextProperties.x) &&
    isFiniteNumber(nextProperties.y) &&
    (isFiniteNumber(nextProperties.radius) ||
      (isFiniteNumber(nextProperties.width) && isFiniteNumber(nextProperties.height)))
  ) {
    return nextProperties;
  }

  if (!circleBand) {
    return nextProperties;
  }

  const inferredRadius = Math.max((circleBand.outer.radius + circleBand.inner.radius) / 2, 1);

  return {
    ...nextProperties,
    ...(isFiniteNumber(nextProperties.x) ? {} : { x: circleBand.outer.x }),
    ...(isFiniteNumber(nextProperties.y) ? {} : { y: circleBand.outer.y }),
    ...(isFiniteNumber(nextProperties.radius) ? {} : { radius: inferredRadius }),
  };
};

const inferCenterTextGeometry = (properties = {}, circles = [], roleLabel = "") => {
  const normalizedProperties = normalizeTextColor(properties);
  if (circles.length === 0) {
    return normalizedProperties;
  }

  const sortedCircles = [...circles].sort((a, b) => a.radius - b.radius);
  const inner = sortedCircles[0];
  const hasExplicitPosition =
    isFiniteNumber(normalizedProperties.x) && isFiniteNumber(normalizedProperties.y);
  const text = typeof normalizedProperties.text === "string" ? normalizedProperties.text : "";
  const fontSize = isFiniteNumber(normalizedProperties.fontSize) ? normalizedProperties.fontSize : 18;
  const distanceFromInnerCenter = hasExplicitPosition
    ? Math.hypot(normalizedProperties.x - inner.x, normalizedProperties.y - inner.y)
    : 0;
  const normalizedRoleLabel = String(roleLabel || "").toLowerCase();
  const shouldAnchorToInnerCenter =
    normalizedRoleLabel.includes("center") ||
    !hasExplicitPosition ||
    distanceFromInnerCenter <= Math.max(inner.radius * 0.4, fontSize * 1.5);

  if (shouldAnchorToInnerCenter) {
      return {
        ...normalizedProperties,
        x: inner.x,
        y: inner.y,
        anchor: "center",
        textAlign: "center",
        textBaseline: "middle",
      };
  }

  if (hasExplicitPosition) {
    return normalizedProperties;
  }

  const estimatedWidth = Math.max(text.length, 1) * fontSize * 0.6;

  return {
    ...normalizedProperties,
    x: inner.x - estimatedWidth / 2,
    y: inner.y + fontSize * 0.35,
  };
};

export const normalizeScenario = (scenario) => {
  if (!scenario || typeof scenario !== "object" || Array.isArray(scenario)) {
    return scenario;
  }

  const normalizedScenario = structuredClone(scenario);
  const createdCircles = [];

  normalizedScenario.actions = (normalizedScenario.actions || []).map((action) => {
    if (!action?.payload) {
      return action;
    }

    if (action.payload.properties) {
      action.payload.properties = normalizeGeneratedColors(action.payload.properties);
    }

    if (action.type === "updateObject" && action.payload.properties) {
      action.payload.properties = normalizeGeneratedColors(action.payload.properties);
      return action;
    }

    if (action.type !== "createShape") {
      return action;
    }

    if (action.payload.shapeType === "circle") {
      action.payload.properties = normalizeGeneratedColors(action.payload.properties);
      const geometry = getCircleGeometry(action.payload.properties);
      if (geometry) {
        createdCircles.push(geometry);
      }
      return action;
    }

    if (action.payload.shapeType === "circle-text") {
      action.payload.properties = inferCircleTextGeometry(
        action.payload.properties,
        createdCircles
      );
      return action;
    }

    if (action.payload.shapeType === "text") {
      action.payload.properties = inferCenterTextGeometry(
        action.payload.properties,
        createdCircles,
        action.payload.roleLabel
      );
      return action;
    }

    return action;
  });

  return normalizedScenario;
};

export default normalizeScenario;

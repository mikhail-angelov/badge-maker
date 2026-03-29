import { fitCircleTextBetweenRadii } from "./fitCircleTextBetweenRadii.js";
import { measureTextBox } from "./measureTextBox.js";
import {
  getPreferredCenterAngle,
  normalizeCircleTextLayoutMode,
} from "./layoutModes.js";

const MAX_SAFE_TOP_ARC_START_ANGLE = 80;
const RING_TEXT_PADDING = 4;
const MIN_CIRCLE_TEXT_FONT_SIZE = 10;

const hasFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const normalizeSignedAngle = (value) => {
  const normalized = ((value % 360) + 360) % 360;
  return normalized > 180 ? normalized - 360 : normalized;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const fitWithinCircleBand = ({
  text,
  fontSize,
  fontFamily,
  kerning,
  preferredRadius,
  innerRadius,
  outerRadius,
  layoutMode,
}) => {
  const actualInnerRadius = Math.max(Math.abs(innerRadius), 0);
  const actualOuterRadius = Math.max(Math.abs(outerRadius), actualInnerRadius + 1);
  const safeInnerRadius = Math.max(actualInnerRadius + RING_TEXT_PADDING, 0);
  const safeOuterRadius = Math.max(actualOuterRadius - RING_TEXT_PADDING, safeInnerRadius + 1);
  let currentFontSize = Math.max(Math.round(fontSize), MIN_CIRCLE_TEXT_FONT_SIZE);
  let lastFit = null;

  while (currentFontSize >= MIN_CIRCLE_TEXT_FONT_SIZE) {
    const textBox = measureTextBox({
      text,
      fontSize: currentFontSize,
      fontFamily,
      kerning,
    });
    const minimumRadius = safeInnerRadius + textBox.height;
    const maximumRadius = safeOuterRadius;

    if (minimumRadius <= maximumRadius) {
      const centeredRadius = clamp(
        (safeInnerRadius + safeOuterRadius + textBox.height) / 2,
        minimumRadius,
        maximumRadius
      );
      const candidateRadii = [
        clamp(preferredRadius, minimumRadius, maximumRadius),
        centeredRadius,
        maximumRadius,
        minimumRadius,
      ].filter((radius, index, values) => values.indexOf(radius) === index);

      for (const candidateRadius of candidateRadii) {
        const fit = fitCircleTextBetweenRadii({
          text,
          fontSize: currentFontSize,
          fontFamily,
          kerning,
          textRadius: candidateRadius,
          innerRadius: actualInnerRadius,
          outerRadius: actualOuterRadius,
          layoutMode,
        });

        if (fit.status !== "cannot_fit") {
          return {
            ok: true,
            fontSize: currentFontSize,
            radius: candidateRadius,
            fit,
          };
        }

        lastFit = fit;
      }
    }

    currentFontSize -= 1;
  }

  return {
    ok: false,
    fit: lastFit,
  };
};

export const sanitizeCircleTextGeometry = (properties = {}) => {
  const nextProperties = { ...properties };
  const width = hasFiniteNumber(nextProperties.width) ? Math.abs(nextProperties.width) : null;
  const height = hasFiniteNumber(nextProperties.height) ? Math.abs(nextProperties.height) : null;
  const radius = hasFiniteNumber(nextProperties.radius) ? Math.abs(nextProperties.radius) : null;
  const innerRadiusHint = hasFiniteNumber(nextProperties.innerRadiusHint)
    ? Math.abs(nextProperties.innerRadiusHint)
    : null;
  const outerRadiusHint = hasFiniteNumber(nextProperties.outerRadiusHint)
    ? Math.abs(nextProperties.outerRadiusHint)
    : null;
  const hasArcHints =
    hasFiniteNumber(nextProperties.arcRadius) ||
    hasFiniteNumber(nextProperties.endAngle) ||
    hasFiniteNumber(nextProperties.arcStartAngle) ||
    hasFiniteNumber(nextProperties.arcEndAngle);
  const hintedStartAngle =
    hasFiniteNumber(nextProperties.arcStartAngle) &&
    hasFiniteNumber(nextProperties.arcEndAngle)
      ? ((nextProperties.arcStartAngle + nextProperties.arcEndAngle) / 2 - 270 + 360) % 360
      : null;
  const preferredLayoutMode = normalizeCircleTextLayoutMode(nextProperties.layoutMode) || "top-arc";

  if (nextProperties.font && !nextProperties.fontFamily) {
    nextProperties.fontFamily = nextProperties.font;
  }

  if (!hasFiniteNumber(nextProperties.x) || !hasFiniteNumber(nextProperties.y)) {
    return {
      ok: false,
      error: "circle-text requires numeric x and y",
    };
  }

  if (radius == null && (width == null || height == null)) {
    return {
      ok: false,
      error: "circle-text requires radius or width and height",
    };
  }

  if (radius == null && width != null && height != null) {
    nextProperties.radius = Math.max(Math.min(width, height) / 2, 1);
    nextProperties.x += width / 2;
    nextProperties.y += height / 2;
  } else {
    nextProperties.radius = radius;
    if (hasArcHints && radius != null) {
      nextProperties.x += radius;
      nextProperties.y += radius;
    }
  }

  if (!hasFiniteNumber(nextProperties.fontSize)) {
    nextProperties.fontSize = 18;
  }
  if (!hasFiniteNumber(nextProperties.kerning)) {
    nextProperties.kerning = 0;
  }
  if (hintedStartAngle != null) {
    nextProperties.startAngle = hintedStartAngle;
  } else if (hasArcHints && hasFiniteNumber(nextProperties.startAngle)) {
    nextProperties.startAngle = (nextProperties.startAngle - 180 + 360) % 360;
  } else if (!hasFiniteNumber(nextProperties.startAngle)) {
    nextProperties.startAngle = getPreferredCenterAngle(preferredLayoutMode);
  }
  if (hasFiniteNumber(nextProperties.startAngle)) {
    const normalizedStartAngle = normalizeSignedAngle(nextProperties.startAngle);
    const preferredCenterAngle = getPreferredCenterAngle(preferredLayoutMode);
    if (preferredLayoutMode === "full-ring") {
      nextProperties.startAngle = normalizedStartAngle;
    } else if (preferredLayoutMode === "bottom-arc") {
      nextProperties.startAngle =
        Math.abs(normalizedStartAngle - preferredCenterAngle) > MAX_SAFE_TOP_ARC_START_ANGLE
          ? preferredCenterAngle
          : normalizedStartAngle;
    } else {
      nextProperties.startAngle =
        Math.abs(normalizedStartAngle) > MAX_SAFE_TOP_ARC_START_ANGLE
          ? preferredCenterAngle
          : normalizedStartAngle;
    }
  }
  if (typeof nextProperties.textInside !== "boolean") {
    nextProperties.textInside = true;
  }
  if (typeof nextProperties.inwardFacing !== "boolean") {
    nextProperties.inwardFacing = true;
  }
  if (!nextProperties.fontFamily) {
    nextProperties.fontFamily = "Arial";
  }
  if (!nextProperties.text) {
    nextProperties.text = "";
  }
  nextProperties.layoutMode = preferredLayoutMode;

  delete nextProperties.width;
  delete nextProperties.height;
  delete nextProperties.arcStartAngle;
  delete nextProperties.arcEndAngle;
  delete nextProperties.arcRadius;
  delete nextProperties.endAngle;
  delete nextProperties.font;
  delete nextProperties.innerRadiusHint;
  delete nextProperties.outerRadiusHint;

  const bandFit =
    nextProperties.textInside &&
    nextProperties.inwardFacing &&
    innerRadiusHint != null &&
    outerRadiusHint != null &&
    outerRadiusHint > innerRadiusHint
      ? fitWithinCircleBand({
          text: nextProperties.text,
          fontSize: nextProperties.fontSize,
          fontFamily: nextProperties.fontFamily,
          kerning: nextProperties.kerning,
          preferredRadius: nextProperties.radius,
          innerRadius: innerRadiusHint,
          outerRadius: outerRadiusHint,
          layoutMode: nextProperties.layoutMode,
        })
      : null;

  if (bandFit?.ok) {
    nextProperties.fontSize = bandFit.fontSize;
    nextProperties.radius = bandFit.radius;
  } else if (preferredLayoutMode === "top-arc") {
    const fullRingFit =
      nextProperties.textInside &&
      nextProperties.inwardFacing &&
      innerRadiusHint != null &&
      outerRadiusHint != null &&
      outerRadiusHint > innerRadiusHint
        ? fitWithinCircleBand({
            text: nextProperties.text,
            fontSize: nextProperties.fontSize,
            fontFamily: nextProperties.fontFamily,
            kerning: nextProperties.kerning,
            preferredRadius: nextProperties.radius,
            innerRadius: innerRadiusHint,
            outerRadius: outerRadiusHint,
            layoutMode: "full-ring",
          })
        : null;

    if (fullRingFit?.ok) {
      nextProperties.layoutMode = "full-ring";
      nextProperties.startAngle = getPreferredCenterAngle("full-ring");
      nextProperties.fontSize = fullRingFit.fontSize;
      nextProperties.radius = fullRingFit.radius;
    }
  }

  const fit =
    bandFit?.fit ||
    fitCircleTextBetweenRadii({
      text: nextProperties.text,
      fontSize: nextProperties.fontSize,
      fontFamily: nextProperties.fontFamily,
      kerning: nextProperties.kerning,
      textRadius: nextProperties.radius,
      innerRadius: Math.max(nextProperties.radius - nextProperties.fontSize * 1.8, 0),
      outerRadius: nextProperties.radius + nextProperties.fontSize * 0.5,
      layoutMode: nextProperties.layoutMode,
    });

  if (fit.status === "cannot_fit") {
    return {
      ok: false,
      error: `circle-text geometry cannot fit (${fit.reason})`,
      fit,
    };
  }

  if (nextProperties.textInside && !bandFit?.ok) {
    nextProperties.radius = Math.max(
      nextProperties.radius - nextProperties.fontSize * 0.5,
      1
    );
  }

  return {
    ok: true,
    properties: nextProperties,
    fit,
  };
};

export default sanitizeCircleTextGeometry;

import { measureCircleText } from "./measureCircleText.js";
import { detectCircleTextCollision } from "./detectCircleTextCollision.js";
import { getMaxArcSpanDegrees } from "./layoutModes.js";

export const fitCircleTextBetweenRadii = ({
  text = "",
  fontSize = 18,
  fontFamily = "Arial",
  kerning = 0,
  textRadius = null,
  innerRadius = 0,
  outerRadius = 0,
  layoutMode = "top-arc",
  minInnerClearance = 0,
  minOuterClearance = 0,
  minEdgeClearanceDegrees = 8,
}) => {
  if (outerRadius <= 0 || outerRadius <= innerRadius) {
    return {
      status: "cannot_fit",
      reason: "invalid_radii",
    };
  }

  const effectiveTextRadius =
    typeof textRadius === "number" && Number.isFinite(textRadius) ? textRadius : outerRadius;

  const measurement = measureCircleText({
    text,
    fontSize,
    fontFamily,
    kerning,
    radius: effectiveTextRadius,
  });

  if (measurement.effectiveRadius <= 0) {
    return {
      status: "cannot_fit",
      reason: "radius_too_small",
      measurement,
    };
  }

  const bandThickness = outerRadius - innerRadius;
  const minimumBandThickness = measurement.height * 0.8 + minInnerClearance + minOuterClearance;
  if (bandThickness < minimumBandThickness) {
    return {
      status: "cannot_fit",
      reason: "band_too_thin",
      measurement,
    };
  }

  const collision = detectCircleTextCollision({
      text,
      fontSize,
      fontFamily,
      kerning,
      radius: effectiveTextRadius,
      innerRadius,
      outerRadius,
    layoutMode,
    minInnerClearance,
    minOuterClearance,
    minEdgeClearanceDegrees,
    measurement,
  });
  const maxArcDegrees = getMaxArcSpanDegrees(layoutMode);

  if (minInnerClearance > 0 && collision.collidesInnerStroke) {
    return {
      status: "cannot_fit",
      reason: "inner_clearance_violation",
      measurement,
      collision,
    };
  }

  if (minOuterClearance > 0 && collision.collidesOuterStroke) {
    return {
      status: "cannot_fit",
      reason: "outer_clearance_violation",
      measurement,
      collision,
    };
  }

  if (measurement.arcDegrees <= maxArcDegrees * 0.75) {
    return {
      status: "fit",
      measurement,
      collision,
    };
  }

  if (!collision.exceedsArcSpan && measurement.arcDegrees <= maxArcDegrees) {
    return {
      status: "tight_fit",
      measurement,
      collision,
    };
  }

  return {
    status: "cannot_fit",
    reason: "arc_too_wide",
    measurement,
    collision,
  };
};

export default fitCircleTextBetweenRadii;

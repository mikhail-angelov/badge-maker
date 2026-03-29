import { getMaxArcSpanDegrees } from "./layoutModes.js";
import { measureCircleText } from "./measureCircleText.js";

export const detectCircleTextCollision = ({
  text = "",
  fontSize = 18,
  fontFamily = "Arial",
  kerning = 0,
  radius = 0,
  innerRadius = 0,
  outerRadius = 0,
  layoutMode = "top-arc",
  minInnerClearance = 4,
  minOuterClearance = 4,
  minEdgeClearanceDegrees = 8,
  measurement = null,
}) => {
  const nextMeasurement =
    measurement ||
    measureCircleText({
      text,
      fontSize,
      fontFamily,
      kerning,
      radius,
    });
  const maxArcDegrees = getMaxArcSpanDegrees(layoutMode);
  const innerClearance = radius - nextMeasurement.height - innerRadius;
  const outerClearance = outerRadius - radius;
  const edgeClearanceDegrees = Math.max((maxArcDegrees - nextMeasurement.arcDegrees) / 2, 0);

  return {
    innerClearance,
    outerClearance,
    edgeClearanceDegrees,
    maxArcDegrees,
    collidesInnerStroke: innerClearance < minInnerClearance,
    collidesOuterStroke: outerClearance < minOuterClearance,
    exceedsArcSpan: nextMeasurement.arcDegrees > maxArcDegrees - minEdgeClearanceDegrees * 2,
  };
};

export default detectCircleTextCollision;

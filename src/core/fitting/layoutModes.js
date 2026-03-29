export const CIRCLE_TEXT_LAYOUT_MODES = [
  "top-arc",
  "bottom-arc",
  "full-ring",
  "split-ring",
];

export const TEXT_ANCHOR_MODES = ["origin", "center"];

export const getMaxArcSpanDegrees = (layoutMode = "top-arc") => {
  switch (layoutMode) {
    case "top-arc":
    case "bottom-arc":
      return 160;
    case "full-ring":
      return 320;
    case "split-ring":
      return 150;
    default:
      return 160;
  }
};

export const getPreferredCenterAngle = (layoutMode = "top-arc") => {
  switch (layoutMode) {
    case "bottom-arc":
      return 180;
    case "full-ring":
      return 0;
    case "split-ring":
      return 0;
    case "top-arc":
    default:
      return 0;
  }
};

export const normalizeCircleTextLayoutMode = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return CIRCLE_TEXT_LAYOUT_MODES.includes(normalized) ? normalized : null;
};

export const normalizeTextAnchorMode = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return TEXT_ANCHOR_MODES.includes(normalized) ? normalized : null;
};


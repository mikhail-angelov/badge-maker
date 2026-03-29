export const SCENARIO_SCHEMA_VERSION = 1;

export const ALLOWED_SHAPE_TYPES = [
  "rectangle",
  "circle",
  "image",
  "text",
  "circle-text",
];

export const ALLOWED_ACTION_TYPES = [
  "createShape",
  "updateObject",
  "removeObject",
  "alignObjects",
  "moveToFront",
  "moveToBack",
  "replaceCanvas",
  "selectObjects",
  "clearSelection",
];

export const ALLOWED_ALIGNMENT_TYPES = [
  "center-horizontal",
  "center-vertical",
  "justify-left",
  "justify-right",
  "justify-top",
  "justify-bottom",
];

export const ALLOWED_FONTS = [
  "Arial",
  "Courier New",
  "Georgia",
  "Times New Roman",
  "Trebuchet MS",
  "Verdana",
];

export const ALLOWED_CIRCLE_TEXT_LAYOUT_MODES = [
  "top-arc",
  "bottom-arc",
  "full-ring",
  "split-ring",
];

export const ALLOWED_TEXT_ANCHORS = [
  "origin",
  "center",
];

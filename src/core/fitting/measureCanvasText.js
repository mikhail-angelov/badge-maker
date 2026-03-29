const WIDTH_FACTORS = {
  " ": 0.35,
  I: 0.38,
  J: 0.45,
  L: 0.48,
  T: 0.58,
  f: 0.42,
  i: 0.3,
  j: 0.32,
  l: 0.3,
  m: 0.9,
  w: 0.82,
  M: 0.95,
  W: 1,
};

let cachedContext = null;

const getCharacterWidthFactor = (character) => {
  if (WIDTH_FACTORS[character] != null) {
    return WIDTH_FACTORS[character];
  }
  if (/[A-Z]/.test(character)) {
    return 0.72;
  }
  if (/[0-9]/.test(character)) {
    return 0.62;
  }
  return 0.58;
};

const getCanvasContext = () => {
  if (cachedContext) {
    return cachedContext;
  }
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  cachedContext = canvas.getContext("2d");
  return cachedContext;
};

const estimateText = ({ text = "", fontSize = 18, kerning = 0 }) => {
  const normalizedText = String(text);
  const glyphWidths = normalizedText.split("").map((character) => {
    return getCharacterWidthFactor(character) * fontSize;
  });
  const width =
    glyphWidths.reduce((sum, glyphWidth) => sum + glyphWidth, 0) +
    Math.max(normalizedText.length - 1, 0) * kerning;

  return {
    width,
    height: fontSize * 1.2,
    glyphWidths,
    source: "estimate",
  };
};

export const measureCanvasText = ({
  text = "",
  fontSize = 18,
  fontFamily = "Arial",
  kerning = 0,
}) => {
  const normalizedText = String(text);
  const context = getCanvasContext();

  if (!context) {
    return estimateText({ text: normalizedText, fontSize, kerning });
  }

  context.font = `${fontSize}pt ${fontFamily}`;
  const glyphWidths = normalizedText.split("").map((character) => {
    return context.measureText(character).width;
  });
  const width =
    glyphWidths.reduce((sum, glyphWidth) => sum + glyphWidth, 0) +
    Math.max(normalizedText.length - 1, 0) * kerning;
  const sampleMetrics = context.measureText(normalizedText || "Mg");
  const measuredHeight =
    (sampleMetrics.actualBoundingBoxAscent || 0) + (sampleMetrics.actualBoundingBoxDescent || 0);

  return {
    width,
    height: measuredHeight > 0 ? measuredHeight : fontSize * 1.2,
    glyphWidths,
    source: "canvas",
  };
};

export default measureCanvasText;

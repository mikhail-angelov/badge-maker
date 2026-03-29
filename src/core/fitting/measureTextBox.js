import { measureCanvasText } from "./measureCanvasText.js";

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

export const measureTextBox = ({ text = "", fontSize = 18, fontFamily = "Arial", kerning = 0 }) => {
  const browserMeasurement = measureCanvasText({
    text,
    fontSize,
    fontFamily,
    kerning,
  });
  if (browserMeasurement) {
    return browserMeasurement;
  }

  const normalizedText = String(text);
  const width =
    normalizedText.split("").reduce((sum, character) => {
      return sum + getCharacterWidthFactor(character) * fontSize;
    }, 0) + Math.max(normalizedText.length - 1, 0) * kerning;

  return {
    width,
    height: fontSize * 1.2,
    source: "approximation",
  };
};

export default measureTextBox;

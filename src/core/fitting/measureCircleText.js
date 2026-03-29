import { measureTextBox } from "./measureTextBox.js";

export const measureCircleText = ({
  text = "",
  fontSize = 18,
  fontFamily = "Arial",
  kerning = 0,
  radius = 0,
}) => {
  const textBox = measureTextBox({ text, fontSize, fontFamily, kerning });
  const effectiveRadius = radius - textBox.height;

  if (effectiveRadius <= 0) {
    return {
      ...textBox,
      effectiveRadius,
      arcRadians: Number.POSITIVE_INFINITY,
      arcDegrees: Number.POSITIVE_INFINITY,
    };
  }

  const arcRadians = textBox.width / effectiveRadius;
  return {
    ...textBox,
    effectiveRadius,
    arcRadians,
    arcDegrees: (arcRadians * 180) / Math.PI,
  };
};

export default measureCircleText;

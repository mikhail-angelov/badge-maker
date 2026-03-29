const UNSAFE_PATTERN = /<script\b|<foreignObject\b|<iframe\b|<object\b|<embed\b|on[a-z]+\s*=|href\s*=|xlink:href\s*=|javascript:/i;
const SVG_WRAPPER_PATTERN = /^\s*<svg\b[\s\S]*<\/svg>\s*$/i;
const VIEWBOX_PATTERN = /\bviewBox\s*=\s*["'][^"']+["']/i;
const SVG_PAINT_PATTERN =
  /\s(fill|stroke)\s*=\s*["'](?!none\b|currentColor\b)[^"']*["']/gi;
const SVG_INLINE_STYLE_PAINT_PATTERN =
  /\sstyle\s*=\s*["'][^"']*\b(fill|stroke)\s*:\s*[^;"']+;?[^"']*["']/gi;

const buildSvgDataUri = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const forceSvgBlack = (svg) =>
  svg
    .replace(SVG_INLINE_STYLE_PAINT_PATTERN, "")
    .replace(SVG_PAINT_PATTERN, (_match, attr) => ` ${attr}="#000000"`);

const sanitizeSvgMarkup = (svg) => {
  if (typeof svg !== "string" || !svg.trim()) {
    return {
      ok: false,
      error: "SVG icon must be a non-empty string",
    };
  }

  const trimmed = svg.trim();
  if (!SVG_WRAPPER_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: "SVG icon must contain a single <svg> root",
    };
  }

  if (UNSAFE_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: "SVG icon contains unsafe markup",
    };
  }

  if (!VIEWBOX_PATTERN.test(trimmed)) {
    return {
      ok: false,
      error: "SVG icon must include a bounded viewBox",
    };
  }

  return {
    ok: true,
    svg: forceSvgBlack(trimmed),
  };
};

const assertSafeSvgMarkup = (svg) => {
  const result = sanitizeSvgMarkup(svg);
  if (!result.ok) {
    throw new Error(result.error);
  }
  return result.svg;
};

export const sanitizeSvgIcon = (value) => {
  const rawSvg =
    typeof value === "string"
      ? value
      : typeof value?.svgMarkup === "string"
        ? value.svgMarkup
        : null;

  if (!rawSvg) {
    return {
      ok: false,
      error: "SVG icon must be provided as raw svgMarkup",
    };
  }

  const sanitized = sanitizeSvgMarkup(rawSvg);
  if (!sanitized.ok) {
    return sanitized;
  }

  return {
    ok: true,
    svg: sanitized.svg,
    svgMarkup: sanitized.svg,
    imageSrc: buildSvgDataUri(sanitized.svg),
  };
};

export { assertSafeSvgMarkup };
export default sanitizeSvgIcon;

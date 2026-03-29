const stripCodeFence = (content) =>
  content
    .trim()
    .replace(/^```(?:svg|xml)?\s*/i, "")
    .replace(/\s*```$/, "");

export const parseSvgResponse = (content) => {
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("Model response was empty");
  }

  return stripCodeFence(content);
};

export default parseSvgResponse;

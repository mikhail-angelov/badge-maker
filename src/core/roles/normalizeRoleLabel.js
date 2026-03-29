export const normalizeRoleLabel = (value) => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || null;
};

export const ensureUniqueRoleLabel = (baseRoleLabel, existingRoleLabels = []) => {
  if (!baseRoleLabel) {
    return null;
  }

  const takenLabels = new Set(existingRoleLabels.filter(Boolean));
  if (!takenLabels.has(baseRoleLabel)) {
    return baseRoleLabel;
  }

  let suffix = 2;
  let candidate = `${baseRoleLabel}-${suffix}`;

  while (takenLabels.has(candidate)) {
    suffix += 1;
    candidate = `${baseRoleLabel}-${suffix}`;
  }

  return candidate;
};

export const canonicalizeRoleLabel = (value, existingRoleLabels = []) => {
  const normalized = normalizeRoleLabel(value);
  return ensureUniqueRoleLabel(normalized, existingRoleLabels);
};

export default canonicalizeRoleLabel;

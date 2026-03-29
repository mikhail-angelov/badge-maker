import { normalizeRoleLabel } from "./normalizeRoleLabel.js";

export const resolveRoleLabel = (objects, roleLabel) => {
  const normalized = normalizeRoleLabel(roleLabel);
  if (!normalized) {
    return null;
  }

  return objects.find((object) => object.roleLabel === normalized) || null;
};

export const resolveRoleLabels = (objects, roleLabels = []) => {
  const resolvedObjects = [];
  const missingRoleLabels = [];

  roleLabels.forEach((roleLabel) => {
    const object = resolveRoleLabel(objects, roleLabel);
    if (!object) {
      missingRoleLabels.push(roleLabel);
      return;
    }
    resolvedObjects.push(object);
  });

  return {
    resolvedObjects,
    missingRoleLabels,
  };
};

export default resolveRoleLabel;

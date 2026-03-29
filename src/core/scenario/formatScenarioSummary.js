export const formatScenarioSummary = (scenario) => {
  if (!scenario?.actions?.length) {
    return "No actions to preview.";
  }

  const describePropertyKeys = (properties = {}) => {
    const keys = Object.keys(properties).filter((key) => properties[key] !== undefined);
    return keys.length ? ` (${keys.join(", ")})` : "";
  };

  const describeCreateShape = (payload) => {
    const roleLabelPart = payload.roleLabel ? ` as ${payload.roleLabel}` : "";
    if (payload.shapeType === "circle-text" && payload.properties?.layoutMode) {
      return `Create ${payload.shapeType}${roleLabelPart} [${payload.properties.layoutMode}]`;
    }
    if (payload.shapeType === "text" && payload.properties?.anchor === "center") {
      return `Create ${payload.shapeType}${roleLabelPart} [centered]`;
    }
    return `Create ${payload.shapeType}${roleLabelPart}`;
  };

  const describeTarget = (payload) => {
    if (payload.roleLabel) {
      return payload.roleLabel;
    }
    if (payload.objectId != null) {
      return `object ${payload.objectId}`;
    }
    return "selection";
  };

  const describeTargetList = (payload) => {
    if (payload.roleLabels?.length) {
      return payload.roleLabels.join(", ");
    }
    if (payload.objectIds?.length) {
      return `${payload.objectIds.length} objects`;
    }
    return "selection";
  };

  return scenario.actions
    .map((action, index) => {
      const prefix = `${index + 1}.`;
      switch (action.type) {
        case "createShape":
          return `${prefix} ${describeCreateShape(action.payload)}`;
        case "updateObject":
          return `${prefix} Update ${describeTarget(action.payload)}${describePropertyKeys(
            action.payload.properties
          )}`;
        case "removeObject":
          return `${prefix} Remove ${describeTarget(action.payload)}`;
        case "alignObjects":
          return `${prefix} Align ${describeTargetList(action.payload)} (${action.payload.alignment})`;
        case "moveToFront":
          return `${prefix} Move ${describeTarget(action.payload)} to front`;
        case "moveToBack":
          return `${prefix} Move ${describeTarget(action.payload)} to back`;
        case "replaceCanvas":
          return `${prefix} Replace canvas with ${action.payload.objects.length} objects`;
        case "selectObjects":
          return `${prefix} Select ${describeTargetList(action.payload)}`;
        case "clearSelection":
          return `${prefix} Clear selection`;
        default:
          return `${prefix} ${action.type}`;
      }
    })
    .join("\n");
};

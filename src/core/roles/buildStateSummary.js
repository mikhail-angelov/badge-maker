const summarizeProperties = (properties) =>
  Object.fromEntries(
    Object.entries(properties).filter(([key, value]) => {
      if (value == null) {
        return false;
      }
      if (key === "imageSrc" && typeof value === "string" && value.startsWith("data:")) {
        return false;
      }
      return ["string", "number", "boolean"].includes(typeof value);
    })
  );

const formatNumber = (value) =>
  typeof value === "number" && Number.isFinite(value) ? Math.round(value * 10) / 10 : null;

const buildDerivedGeometry = (type, properties) => {
  switch (type) {
    case "circle":
      return {
        centerX: formatNumber(properties.x),
        centerY: formatNumber(properties.y),
        radius: formatNumber(properties.radius),
        diameter:
          typeof properties.radius === "number" ? formatNumber(properties.radius * 2) : null,
      };
    case "rectangle":
    case "image":
      return {
        x: formatNumber(properties.x),
        y: formatNumber(properties.y),
        width: formatNumber(properties.width),
        height: formatNumber(properties.height),
      };
    case "text":
      return {
        x: formatNumber(properties.x),
        y: formatNumber(properties.y),
        fontSize: formatNumber(properties.fontSize),
        ...(properties.anchor ? { anchor: properties.anchor } : {}),
      };
    case "circle-text":
      return {
        centerX: formatNumber(properties.x),
        centerY: formatNumber(properties.y),
        radius: formatNumber(properties.radius),
        startAngle: formatNumber(properties.startAngle),
        fontSize: formatNumber(properties.fontSize),
        ...(properties.layoutMode ? { layoutMode: properties.layoutMode } : {}),
      };
    default:
      return null;
  }
};

const summarizeObject = ({ type, roleLabel = null, properties = {} }, stackIndex) => {
  const compactProperties = summarizeProperties(properties);
  const derivedGeometry = buildDerivedGeometry(type, compactProperties);
  const sourceKind =
    type === "image" && typeof properties.imageSrc === "string"
      ? properties.imageSrc.startsWith("data:image/svg+xml")
        ? "embedded-svg"
        : properties.imageSrc.startsWith("data:")
          ? "embedded-image"
          : "external-image"
      : null;

  const baseSummary = {
    type,
    roleLabel,
    stackIndex,
    properties: compactProperties,
    ...(derivedGeometry ? { geometry: derivedGeometry } : {}),
    ...(sourceKind ? { sourceKind } : {}),
  };

  switch (type) {
    case "circle":
      return {
        ...baseSummary,
        summary: `circle center=(${formatNumber(compactProperties.x)}, ${formatNumber(compactProperties.y)}) radius=${formatNumber(compactProperties.radius)}`,
      };
    case "rectangle":
      return {
        ...baseSummary,
        summary: `rectangle origin=(${formatNumber(compactProperties.x)}, ${formatNumber(compactProperties.y)}) size=${formatNumber(compactProperties.width)}x${formatNumber(compactProperties.height)}`,
      };
    case "text":
      return {
        ...baseSummary,
        summary:
          compactProperties.anchor === "center"
            ? `text "${compactProperties.text || ""}" centered at (${formatNumber(compactProperties.x)}, ${formatNumber(compactProperties.y)})`
            : `text "${compactProperties.text || ""}" at (${formatNumber(compactProperties.x)}, ${formatNumber(compactProperties.y)})`,
      };
    case "circle-text":
      return {
        ...baseSummary,
        summary: `circle-text "${compactProperties.text || ""}" center=(${formatNumber(compactProperties.x)}, ${formatNumber(compactProperties.y)}) radius=${formatNumber(compactProperties.radius)} layout=${compactProperties.layoutMode || "top-arc"}`,
      };
    case "image":
      return {
        ...baseSummary,
        summary: `image origin=(${formatNumber(compactProperties.x)}, ${formatNumber(compactProperties.y)}) size=${formatNumber(compactProperties.width)}x${formatNumber(compactProperties.height)}`,
      };
    default:
      return baseSummary;
  }
};

export const buildStateSummary = (input) => {
  const config = Array.isArray(input)
    ? { objects: input, selectedObjectIds: [], activeObjectId: null }
    : input || {};
  const {
    objects = [],
    selectedObjectIds = [],
    activeObjectId = null,
  } = config;

  return {
    objectCount: objects.length,
    availableRoleLabels: objects
      .map((object) => object.roleLabel)
      .filter(Boolean)
      .sort(),
    activeRoleLabel:
      objects.find((object) => object.id === activeObjectId)?.roleLabel || null,
    selectedRoleLabels: objects
      .filter((object) => selectedObjectIds.includes(object.id))
      .map((object) => object.roleLabel)
      .filter(Boolean),
    objects: objects.map(summarizeObject),
  };
};

export default buildStateSummary;

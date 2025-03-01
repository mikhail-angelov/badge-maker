const divForMeasureText = document.createElement("div");
divForMeasureText.innerHTML = "";
divForMeasureText.style.position = "absolute";
divForMeasureText.style.top = "-10000px";
divForMeasureText.style.left = "-10000px";
document.body.appendChild(divForMeasureText);

const TEXT_OUTLINE_PADDING = 5;
const RECT_OUTLINE_PADDING = 2;

const renderRect = (context, shape) => {
  const { x, y, width, height, color } = shape.properties;
  context.fillStyle = color || "black";
  context.fillRect(x, y, width, height);
};
const renderCircle = (context, shape) => {
  const { x, y, radius, color } = shape.properties;
  context.fillStyle = color || "black";
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
};
const renderImage = (context, shape) => {
  const { x, y, width, height } = shape.properties;
  context.drawImage(shape.image, x, y, width, height);
};
const renderText = (context, shape) => {
  const {
    x,
    y,
    text,
    fontSize,
    fontFamily,
    color,
    rotation = 0,
  } = shape.properties;
  context.fillStyle = color || "black";
  context.font = fontSize + "pt " + fontFamily;

  if (rotation) {
    // Measure the text width to calculate the center
    const textWidth = context.measureText(text).width;
    const centerX = x + textWidth / 2;
    const centerY = y;

    // Apply rotation around the center of the text
    context.translate(centerX, centerY);
    context.rotate((rotation * Math.PI) / 180);
    context.translate(-centerX, -centerY);
  }

  context.fillText(text, x, y);
};

const renderCircleText = (context, shape) => {
  let {
    x,
    y,
    text,
    fontSize,
    fontFamily,
    color,
    radius,
    startAngle = 0,
    kerning = 0,
  } = shape.properties;
  let align = "center";
  let textInside = true;
  let inwardFacing = true;

  const clockwise = align == "right" ? 1 : -1; // draw clockwise for aligned right. Else Anticlockwise
  startAngle = startAngle * (Math.PI / 180); // convert to radians

  // calculate height of the font. Many ways to do this
  // you can replace with your own!
  divForMeasureText.innerHTML = text;
  divForMeasureText.style.fontFamily = fontFamily;
  divForMeasureText.style.fontSize = `${fontSize}pt`;
  const textHeight = divForMeasureText.offsetHeight;

  // in cases where we are drawing outside radius,
  // expand radius to handle it
  if (!textInside) radius += textHeight;

  context.save(); // Save the current context state
  context.fillStyle = color || "black";
  context.font = fontSize + "pt " + fontFamily;

  // Reverse letters for align Left inward, align right outward
  // and align center inward.
  if (
    (["left", "center"].indexOf(align) > -1 && inwardFacing) ||
    (align == "right" && !inwardFacing)
  )
    text = text.split("").reverse().join("");

  // Setup letters and positioning
  context.translate(x, y); // Move to the specified x, y position
  startAngle += Math.PI * !inwardFacing; // Rotate 180 if outward
  context.textBaseline = "middle"; // Ensure we draw in exact center
  context.textAlign = "center"; // Ensure we draw in exact center

  // rotate 50% of total angle for center alignment
  if (align == "center") {
    for (let j = 0; j < text.length; j++) {
      const charWid = context.measureText(text[j]).width;
      startAngle +=
        ((charWid + (j == text.length - 1 ? 0 : kerning)) /
          (radius - textHeight) /
          2) *
        -clockwise;
    }
  }

  // Phew... now rotate into final start position
  context.rotate(startAngle);

  // Now for the fun bit: draw, rotate, and repeat
  for (let j = 0; j < text.length; j++) {
    const charWid = context.measureText(text[j]).width; // half letter
    // rotate half letter
    context.rotate((charWid / 2 / (radius - textHeight)) * clockwise);
    // draw the character at "top" or "bottom"
    // depending on inward or outward facing
    context.fillText(
      text[j],
      0,
      (inwardFacing ? 1 : -1) * (0 - radius + textHeight / 2)
    );

    context.rotate(
      ((charWid / 2 + kerning) / (radius - textHeight)) * clockwise
    ); // rotate half letter
  }

  context.restore(); // Restore the context to its original state
};

const renderOutline = (context, rect, withoutSpots) => {
  const { x, y, width, height } = rect;
  const cornerSize = 8; // Size of the corner squares

  // Save the current context state
  context.save();

  // Reset the scale to 1 for drawing the outline
  context.setTransform(1, 0, 0, 1, 0, 0);

  // Draw the light blue outline
  context.strokeStyle = withoutSpots?"orange":"lightblue";
  context.lineWidth = 1;
  context.strokeRect(x, y, width, height);

  if (!withoutSpots) {
    // Draw small squares on each corner
    context.fillStyle = "lightblue";
    context.strokeRect(
      x - cornerSize / 2,
      y - cornerSize / 2,
      cornerSize,
      cornerSize
    ); // Top-left corner
    context.strokeRect(
      x + width - cornerSize / 2,
      y - cornerSize / 2,
      cornerSize,
      cornerSize
    ); // Top-right corner
    context.strokeRect(
      x - cornerSize / 2,
      y + height - cornerSize / 2,
      cornerSize,
      cornerSize
    ); // Bottom-left corner
    context.strokeRect(
      x + width - cornerSize / 2,
      y + height - cornerSize / 2,
      cornerSize,
      cornerSize
    ); // Bottom-right corner
  }
  // Restore the context to its original state
  context.restore();
};
const renderRectOutline = (context, shape, scale, withoutSpots) => {
  const x = (shape.properties.x - RECT_OUTLINE_PADDING) * scale;
  const y = (shape.properties.y - RECT_OUTLINE_PADDING) * scale;
  const width = (shape.properties.width + RECT_OUTLINE_PADDING * 2) * scale;
  const height = (shape.properties.height + RECT_OUTLINE_PADDING * 2) * scale;
  renderOutline(context, { x, y, width, height }, withoutSpots);
};

const renderTextOutline = (context, shape, scale, withoutSpots) => {
  const { x, y, width, height } = getTextBox(shape.properties);

  if (shape.properties.rotation) {
    const centerX = x + width / 2;
    const centerY = y + TEXT_OUTLINE_PADDING * 2 + height / 2;
    context.translate(centerX, centerY);
    context.rotate((shape.properties.rotation * Math.PI) / 180);
    context.translate(-centerX, -centerY);
  }
  renderOutline(
    context,
    {
      x: x * scale,
      y: y * scale,
      width: width * scale,
      height: height * scale,
    },
    withoutSpots
  );
};

const renderCircleOutline = (context, shape, scale, withoutSpots) => {
  const { x, y, width, height } = shape.rect
    ? shape.rect
    : getCircleBox(shape.properties);
  renderOutline(
    context,
    {
      x: x * scale,
      y: y * scale,
      width: width * scale,
      height: height * scale,
    },
    withoutSpots
  );
};

const getRectBox = (properties) => {
  const { x, y, width, height } = properties;
  return { x, y, width, height };
};
const getCircleBox = (properties) => {
  const { x, y, radius } = properties;
  return {
    x: x - radius,
    y: y - radius,
    width: radius * 2,
    height: radius * 2,
  };
};
const getTextBox = (properties) => {
  const { x, y, text, fontFamily, fontSize } = properties;
  divForMeasureText.innerHTML = text;
  divForMeasureText.style.fontFamily = fontFamily;
  divForMeasureText.style.fontSize = `${fontSize}pt`;
  return {
    x: x - TEXT_OUTLINE_PADDING,
    y: y - divForMeasureText.offsetHeight - TEXT_OUTLINE_PADDING,
    width: divForMeasureText.offsetWidth + TEXT_OUTLINE_PADDING * 2,
    height: divForMeasureText.offsetHeight + TEXT_OUTLINE_PADDING * 2,
  };
};
//mutate shape
const updateRectOnEvent = (shape, event, point) => {
  const { x, y } = point;
  if (event.includes("n")) {
    shape.properties.height = shape.properties.y - y + shape.properties.height;
    shape.properties.y = y;
  }
  if (event.includes("s")) {
    shape.properties.height = y - shape.properties.y;
  }
  if (event.includes("w")) {
    shape.properties.width = shape.properties.x - x + shape.properties.width;
    shape.properties.x = x;
  }
  if (event.includes("e")) {
    shape.properties.width = x - shape.properties.x;
  }
};
const updateCircleOnEvent = (shape, event, point) => {
  if (!shape.rect) {
    const { x, y, width, height } = getCircleBox(shape.properties);
    shape.rect = { x, y, width, height };
  }
  let { x, y, width, height } = shape.rect;
  if (event.includes("n")) {
    height = y - point.y + height;
    y = point.y;
  }
  if (event.includes("s")) {
    height = point.y - y;
  }
  if (event.includes("w")) {
    width = x - point.x + width;
    x = point.x;
  }
  if (event.includes("e")) {
    width = point.x - x;
  }
  shape.rect = { x, y, width, height };
  shape.properties.x = x + width / 2;
  shape.properties.y = y + height / 2;
  shape.properties.radius = Math.abs(Math.min(width, height)) / 2;
};

const renderMap = {
  ["rectangle"]: renderRect,
  ["circle"]: renderCircle,
  ["image"]: renderImage,
  ["text"]: renderText,
  ["circle-text"]: renderCircleText,
};
const renderOutlineMap = {
  ["rectangle"]: renderRectOutline,
  ["circle"]: renderCircleOutline,
  ["image"]: renderRectOutline,
  ["text"]: renderTextOutline,
  ["circle-text"]: renderCircleOutline,
};
const shapeBoxMap = {
  ["rectangle"]: getRectBox,
  ["circle"]: getCircleBox,
  ["image"]: getRectBox,
  ["text"]: getTextBox,
  ["circle-text"]: getCircleBox,
};
const updateShapeMap = {
  ["rectangle"]: updateRectOnEvent,
  ["circle"]: updateCircleOnEvent,
  ["image"]: updateRectOnEvent,
  ["text"]: updateRectOnEvent,
  ["circle-text"]: updateCircleOnEvent,
};

// draw functions should never throw exceptions. They should log errors and continue.
const drawShape = ({ context, shape }) => {
  try {
    context.save();
    renderMap[shape.type](context, shape);
    context.restore();
  } catch (e) {
    console.log("Error drawing shape", shape, e);
  }
};

const drawOutline = ({ context, shape, scale, withoutSpots }) => {
  try {
    context.save();
    renderOutlineMap[shape.type](context, shape, scale, withoutSpots);
    context.restore();
  } catch (e) {
    console.log("Error drawing outline", shape, e);
  }
};

const updateShapeOnMouseEvent = (shape, event, point) => {
  try {
    updateShapeMap[shape.type](shape, event, point);
  } catch (e) {
    console.log("Error drawing outline", shape, e);
  }
};

const isPointInShape = (x, y, shape) => {
  if (!shape) return false;
  try {
    const {
      x: objX,
      y: objY,
      width,
      height,
    } = shapeBoxMap[shape.type](shape.properties);
    return x >= objX && x <= objX + width && y >= objY && y <= objY + height;
  } catch (e) {
    console.log("Error checking point in shape", shape, e);
    return false;
  }
};

const isPointInShapeSpot = (x, y, shape) => {
  if (!shape) return null;
  try {
    const {
      x: objX,
      y: objY,
      width,
      height,
    } = shape.rect ? shape.rect : shapeBoxMap[shape.type](shape.properties);
    const cornerSize = 8; // Size of the corner squares

    // Define the spots
    const spots = {
      nw: { x: objX - cornerSize / 2, y: objY - cornerSize / 2 },
      ne: { x: objX + width - cornerSize / 2, y: objY - cornerSize / 2 },
      sw: { x: objX - cornerSize / 2, y: objY + height - cornerSize / 2 },
      se: {
        x: objX + width - cornerSize / 2,
        y: objY + height - cornerSize / 2,
      },
    };

    // Check if the point is inside any of the spots
    for (const [spot, spotCoords] of Object.entries(spots)) {
      if (
        x >= spotCoords.x &&
        x <= spotCoords.x + cornerSize &&
        y >= spotCoords.y &&
        y <= spotCoords.y + cornerSize
      ) {
        return spot;
      }
    }

    return null;
  } catch (e) {
    console.log("Error checking point in shape spot", shape, e);
    return null;
  }
};

export default {
  drawShape,
  drawOutline,
  updateShapeOnMouseEvent,
  isPointInShape,
  isPointInShapeSpot,
};

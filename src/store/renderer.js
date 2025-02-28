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
  let { x, y, text, fontSize, fontFamily, color, radius, startAngle=0, kerning=0 } = shape.properties;
  let align = "center";
  let textInside = true;
  let inwardFacing = true;
  

  // var mainCanvas = document.createElement('canvas');
  var clockwise = align == "right" ? 1 : -1; // draw clockwise for aligned right. Else Anticlockwise
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

  // mainCanvas.width = diameter;
  // mainCanvas.height = diameter;
  // // omit next line for transparent background
  // mainCanvas.style.backgroundColor = 'lightgray';
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
  context.translate(radius, radius); // Move to center
  startAngle += Math.PI * !inwardFacing; // Rotate 180 if outward
  context.textBaseline = "middle"; // Ensure we draw in exact center
  context.textAlign = "center"; // Ensure we draw in exact center

  // rotate 50% of total angle for center alignment
  if (align == "center") {
    for (var j = 0; j < text.length; j++) {
      var charWid = context.measureText(text[j]).width;
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
  for (var j = 0; j < text.length; j++) {
    var charWid = context.measureText(text[j]).width; // half letter
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
};

const renderRectOutline = (context, shape) => {
  const x = shape.properties.x - RECT_OUTLINE_PADDING;
  const y = shape.properties.y - RECT_OUTLINE_PADDING;
  const width = shape.properties.width + RECT_OUTLINE_PADDING * 2;
  const height = shape.properties.height + RECT_OUTLINE_PADDING * 2;
  context.strokeStyle = "purple";
  context.lineWidth = 1;
  context.strokeRect(x, y, width, height);
};

const renderTextOutline = (context, shape) => {
  const { x, y, width, height } = getTextBox(shape.properties);
  
  if (shape.properties.rotation) {
    const centerX = x + width / 2;
    const centerY = y + TEXT_OUTLINE_PADDING * 2 + height / 2;
    context.translate(centerX, centerY);
    context.rotate((shape.properties.rotation * Math.PI) / 180);
    context.translate(-centerX, -centerY);
  }
  context.strokeStyle = "purple";
  context.lineWidth = 1;
  context.strokeRect(x, y, width, height);
};

const renderCircleOutline = (context, shape) => {
  const x = shape.properties.x - shape.properties.radius;
  const y = shape.properties.y - shape.properties.radius;
  const width = shape.properties.radius * 2;
  const height = shape.properties.radius * 2;
  context.strokeStyle = "purple";
  context.lineWidth = 1;
  context.strokeRect(x, y, width, height);
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

// draw functions should never throw exceptions. They should log errors and continue.
const drawShape = (context, shape) => {
  try {
    context.save();
    renderMap[shape.type](context, shape);
    context.restore();
  } catch (e) {
    console.log("Error drawing shape", shape, e);
  }
};

const drawOutline = (context, shape) => {
  try {
    context.save();
    renderOutlineMap[shape.type](context, shape);
    context.restore();
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

export default { drawShape, drawOutline, isPointInShape };

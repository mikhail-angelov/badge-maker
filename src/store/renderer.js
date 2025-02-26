// draw functions should never throw exceptions. They should log errors and continue.

const drawShape = (context, shape) => {
  try {
    const { type, properties } = shape;
    context.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation matrix to the identity matrix
    switch (type) {
      case "rectangle": {
        const { x, y, width, height, color } = properties;
        context.fillStyle = color || "black";
        context.fillRect(x, y, width, height);
        break;
      }
      case "circle": {
        const { x, y, radius, color } = properties;
        context.fillStyle = color || "black";
        context.beginPath();
        context.arc(x, y, radius, 0, Math.PI * 2);
        context.fill();
        break;
      }
      case "image": {
        const { x, y, width, height, imageSrc } = properties;
        const image = new Image();
        image.onload = function() {
          context.drawImage(image, x, y, width, height);
        };
        image.src = imageSrc;
        break;
      }
      case "text": {
        const { x, y, text, fontSize, fontFamily, color } = properties;
        context.fillStyle = color || "black";
        context.font = fontSize + " " + fontFamily;
        context.fillText(text, 210, 250);
        break;
      }
      case "circle-text": {
        let { x, y, text, fontSize, fontFamily, color } = properties;
        let diameter = x + y;
        let align = "center";
        let startAngle = 0;
        let textInside = true;
        let inwardFacing = true;
        let kerning = 0;

        align = align.toLowerCase();
        // var mainCanvas = document.createElement('canvas');
        var clockwise = align == "right" ? 1 : -1; // draw clockwise for aligned right. Else Anticlockwise
        startAngle = startAngle * (Math.PI / 180); // convert to radians

        // calculate height of the font. Many ways to do this
        // you can replace with your own!
        var div = document.createElement("div");
        div.innerHTML = text;
        div.style.position = "absolute";
        div.style.top = "-10000px";
        div.style.left = "-10000px";
        div.style.fontFamily = fontFamily;
        div.style.fontSize = fontSize;
        document.body.appendChild(div);
        var textHeight = div.offsetHeight;
        document.body.removeChild(div);

        // in cases where we are drawing outside diameter,
        // expand diameter to handle it

        if (!textInside) diameter += textHeight * 2;

        // mainCanvas.width = diameter;
        // mainCanvas.height = diameter;
        // // omit next line for transparent background
        // mainCanvas.style.backgroundColor = 'lightgray';
        context.fillStyle = color || "black";
        context.font = fontSize + " " + fontFamily;

        // Reverse letters for align Left inward, align right outward
        // and align center inward.
        if (
          (["left", "center"].indexOf(align) > -1 && inwardFacing) ||
          (align == "right" && !inwardFacing)
        )
          text = text.split("").reverse().join("");

        // Setup letters and positioning
        context.translate(diameter / 2, diameter / 2); // Move to center
        startAngle += Math.PI * !inwardFacing; // Rotate 180 if outward
        context.textBaseline = "middle"; // Ensure we draw in exact center
        context.textAlign = "center"; // Ensure we draw in exact center

        // rotate 50% of total angle for center alignment
        if (align == "center") {
          for (var j = 0; j < text.length; j++) {
            var charWid = context.measureText(text[j]).width;
            startAngle +=
              ((charWid + (j == text.length - 1 ? 0 : kerning)) /
                (diameter / 2 - textHeight) /
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
          context.rotate(
            (charWid / 2 / (diameter / 2 - textHeight)) * clockwise
          );
          // draw the character at "top" or "bottom"
          // depending on inward or outward facing
          context.fillText(
            text[j],
            0,
            (inwardFacing ? 1 : -1) * (0 - diameter / 2 + textHeight / 2)
          );

          context.rotate(
            ((charWid / 2 + kerning) / (diameter / 2 - textHeight)) * clockwise
          ); // rotate half letter
        }
        break;
      }
      default:
        console.log("Unknown shape type", shape);
        break;
    }
  } catch (e) {
    console.log("Error drawing shape", shape, e);
  }
};

const drawOutline = (context, shape) => {
  let x, y, width, height;
  try {
    context.setTransform(1, 0, 0, 1, 0, 0); // Reset transformation matrix to the identity matrix
    if (shape.type === "rectangle" || shape.type === "image") {
      x = shape.properties.x;
      y = shape.properties.y;
      width = shape.properties.width;
      height = shape.properties.height;
    } else if (shape.type === "circle") {
      x = shape.properties.x - shape.properties.radius;
      y = shape.properties.y - shape.properties.radius;
      width = shape.properties.radius * 2;
      height = shape.properties.radius * 2;
    } else if (shape.type === "text") {
      x = shape.properties.x - 5;
      y = shape.properties.y - 5;
      width = 10;
      height = 10;
    } else if (shape.type === "circle-text") {
      x = shape.properties.x - 5;
      y = shape.properties.y - 5;
      width = 10;
      height = 10;
    } else {
      console.log("Unknown shape type", shape);
      return;
    }
    context.strokeStyle = "purple";
    context.lineWidth = 4;
    context.strokeRect(x, y, width, height);
  } catch (e) {
    console.log("Error drawing outline", shape, e);
  }
};

const isPointInShape = (x, y, shape) =>{
  const { type, properties } = shape;
  const { x: objX, y: objY, width, height, radius } = properties;

  if (type === "circle") {
    const dx = x - objX;
    const dy = y - objY;
    return dx * dx + dy * dy <= radius * radius;
  } else {
    return x >= objX && x <= objX + width && y >= objY && y <= objY + height;
  } 
  // return false;
}

export default { drawShape, drawOutline, isPointInShape };

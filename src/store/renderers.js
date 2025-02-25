export const renderer = (context, shape) => {
  const { type, properties } = shape;
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
    case "text": {
      const { x, y, text, fontSize, fontFamily, color } = properties;
      context.fillStyle = color || "black";
      context.font = fontSize + " " + fontFamily;
      context.fillText(text, 210, 250);
      break;
    }
    case "circleText": {
      const { x, y, text, fontSize, fontFamily, color } = properties;
      let diameter = x;
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
        context.rotate((charWid / 2 / (diameter / 2 - textHeight)) * clockwise);
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
    }
    default:
      throw new Error("Unknown shape type");
  }
};

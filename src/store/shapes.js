class Shape {
  constructor(id, type, properties) {
    this.id = id;
    this.type = type;
    this.properties = properties;
  }
}

class Rectangle extends Shape {
  constructor(id, properties) {
    super(id, "rectangle", properties);
  }
}

class Circle extends Shape {
  constructor(id, properties) {
    super(id, "circle", properties);
  }
}

class Text extends Shape {
  constructor(id, properties) {
    super(id, "text", properties);
  }
}

class CircleText extends Shape {
  constructor(id, properties) {
    super(id, "text", properties);
  }
}

export { Shape, Rectangle, Circle, Text, CircleText };

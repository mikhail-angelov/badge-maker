import { renderer } from "../store/renderers.js";

class Canvas {
  constructor(canvasElement, store) {
    this.store = store;
    this.store.subscribe(this.scheduleRender.bind(this));
    this.canvas = canvasElement;
    this.context = this.canvas.getContext("2d");
    this.canvas.width = 800;
    this.canvas.height = 600;

    this.isDragging = false;
    this.draggedObject = null;
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1;
    this.renderScheduled = false;

    this.canvas.addEventListener("click", this.handleCanvasClick.bind(this));
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener("wheel", this.handleWheel.bind(this));
  }

  handleMouseDown(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.scale;
    const y = (event.clientY - rect.top) / this.scale;

    const objects = this.store.getObjects();
    for (const object of objects) {
      if (this.isPointInObject(x, y, object)) {
        this.isDragging = true;
        this.draggedObject = object;
        this.offsetX = x - object.properties.x;
        this.offsetY = y - object.properties.y;
        this.store.selectObject(object);
        break;
      }
    }
  }

  handleMouseMove(event) {
    if (this.isDragging && this.draggedObject) {
      const rect = this.canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / this.scale;
      const y = (event.clientY - rect.top) / this.scale;

      this.draggedObject.properties.x = x - this.offsetX;
      this.draggedObject.properties.y = y - this.offsetY;
      this.scheduleRender();
    }
  }

  handleMouseUp() {
    if (this.isDragging && this.draggedObject) {
      const { id, properties } = this.draggedObject;
      this.store.updateProps(id, properties);
    }
    this.isDragging = false;
    this.draggedObject = null;
  }

  handleCanvasClick(event) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / this.scale;
    const y = (event.clientY - rect.top) / this.scale;

    const objects = this.store.getObjects();
    for (const object of objects) {
      if (this.isPointInObject(x, y, object)) {
        this.store.selectObject(object);
        break;
      }
    }
  }

  handleWheel(event) {
    event.preventDefault();
    const scaleAmount = 0.01;
    if (event.deltaY < 0) {
      this.scale += scaleAmount;
    } else {
      this.scale -= scaleAmount;
      if (this.scale < scaleAmount) {
        this.scale = scaleAmount;
      }
    }
    this.scheduleRender();
  }

  isPointInObject(x, y, object) {
    const { type, properties } = object;
    const { x: objX, y: objY, width, height, radius } = properties;

    if (type === "rectangle") {
      return x >= objX && x <= objX + width && y >= objY && y <= objY + height;
    } else if (type === "circle") {
      const dx = x - objX;
      const dy = y - objY;
      return dx * dx + dy * dy <= radius * radius;
    }
    return false;
  }

  scheduleRender() {
    if (!this.renderScheduled) {
      this.renderScheduled = true;
      requestAnimationFrame(() => {
        this.render();
        this.renderScheduled = false;
      });
    }
  }

  render() {
    this.clear();
    this.context.save();
    this.context.scale(this.scale, this.scale);
    const objects = this.store.getObjects();
    const selectedObject = this.store.getSelectedObject();
    objects.forEach((object) => {
      renderer(this.context, object);
      if (selectedObject && object.id === selectedObject.id) {
        this.drawOutline(object);
      }
    });
    this.context.restore();
  }

  drawOutline(object) {
    const { x, y, width, height, radius } = object.properties;
    this.context.strokeStyle = "purple";
    this.context.lineWidth = 4;

    if (object.type === "rectangle") {
      this.context.strokeRect(x, y, width, height);
    } else if (object.type === "circle") {
      this.context.beginPath();
      this.context.arc(x, y, radius, 0, Math.PI * 2);
      this.context.stroke();
    }
  }

  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  exportAsPNG() {
    const dataURL = this.canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "canvas.png";
    link.click();
  }
}

export default Canvas;

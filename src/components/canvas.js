import shaper from "../store/shaper.js";

class Canvas {
  constructor(canvasElement, store) {
    this.store = store;
    this.store.subscribe(this.scheduleRender.bind(this));
    this.canvas = canvasElement;
    this.context = this.canvas.getContext("2d");
    this.canvas.width = 800;
    this.canvas.height = 600;
    this.scale = 1;
    this.renderScheduled = false;

    this.isDragging = false;
    this.isSizing = "";

    this.canvas.addEventListener("click", this.handleCanvasClick.bind(this));
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener("wheel", this.handleWheel.bind(this));
  }

  getMousePosition(event) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x:
        ((event.clientX - rect.left) * (this.canvas.width / rect.width)) /
        this.scale,
      y:
        ((event.clientY - rect.top) * (this.canvas.height / rect.height)) /
        this.scale,
    };
  }

  handleMouseDown(event) {
    const { x, y } = this.getMousePosition(event);
    const newShapePlaceholder = this.store.getNewShapePlaceholder();

    if (newShapePlaceholder) {
      this.isDragging = true;
      newShapePlaceholder.x = x;
      newShapePlaceholder.y = y;
    } else {
      const objects = this.store.getObjects();
      for (const object of objects) {
        if (shaper.isPointInShape(x, y, object)) {
          this.isDragging = true;
          const { id, type, properties, ...rest } = object;
          const activeObject = structuredClone({ id, type, properties });
          this.store.setActiveObject(Object.assign(activeObject, rest,{offsetX: x - object.properties.x, offsetY: y - object.properties.y}));
          this.store.selectObject(object);
          this.setCursor("grabbing");
          break;
        } else if (shaper.isPointInShapeSpot(x, y, object)) {
          this.isSizing = shaper.isPointInShapeSpot(x, y, object);
        }
      }
    }
  }

  handleMouseMove(event) {
    const activeObject = this.store.getActiveObject();
    const newShapePlaceholder = this.store.getNewShapePlaceholder();
    if (!activeObject && !newShapePlaceholder) {
      return;
    }
    const { x, y } = this.getMousePosition(event);

    if (newShapePlaceholder) {
      newShapePlaceholder.width = x - newShapePlaceholder.x;
      newShapePlaceholder.height = y - newShapePlaceholder.y;
    } else if (activeObject) {
      if (this.isDragging) {
        activeObject.properties.x = x - (activeObject.offsetX || 0);
        activeObject.properties.y = y - (activeObject.offsetY || 0);
      } else if (this.isSizing) {
        shaper.updateShapeOnMouseEvent(activeObject, this.isSizing, {
          x,
          y,
        });
      } else {
        const spot = shaper.isPointInShapeSpot(x, y, activeObject);
        if (spot) {
          this.setCursor(`${spot}-resize`);
        }
      }
    }
    this.scheduleRender();
  }

  handleMouseUp(event) {
    const activeObject = this.store.getActiveObject();
    const newShapePlaceholder = this.store.getNewShapePlaceholder();
    if (this.isDragging && newShapePlaceholder) {
      this.store.addShape(newShapePlaceholder.type, newShapePlaceholder);
    } else if ((this.isDragging || this.isSizing) && activeObject) {
      const { id, properties } = activeObject;
      this.store.updateProps(id, properties);
    }
    this.setCursor("default");
    this.isDragging = false;
    this.isSizing = "";
    this.store.clearNewShapePlaceholder();
  }

  handleCanvasClick(event) {
    const { x, y } = this.getMousePosition(event);
    const objects = this.store.getObjects();
    for (const object of objects) {
      if (shaper.isPointInShape(x, y, object)) {
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
    const activeObject = this.store.getActiveObject();
    const newShapePlaceholder = this.store.getNewShapePlaceholder();
    objects.forEach((object) => {
      if (object.id !== activeObject?.id) {
        shaper.drawShape(this.context, object);
      }
    });
    if (activeObject) {
      shaper.drawShape(this.context, activeObject);
      shaper.drawOutline(this.context, activeObject, this.scale);
    }
    if (newShapePlaceholder) {
      this.drawNewShape(newShapePlaceholder);
    }
    this.context.restore();
  }

  drawNewShape({ x, y, width, height }) {
    this.context.strokeStyle = "lightblue";
    this.context.lineWidth = 1;
    this.context.strokeRect(x, y, width, height);
  }

  clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  setCursor(cursorType) {
    this.canvas.style.cursor = cursorType;
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
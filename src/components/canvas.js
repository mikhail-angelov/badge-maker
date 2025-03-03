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

    window.addEventListener("resize", this.handleResize.bind(this));
    this.handleResize();
  }

  handleResize() {
    const container = this.canvas.parentElement;
    const { width, height } = container.getBoundingClientRect();
    this.canvas.width = width;
    this.canvas.height = height;
    this.scheduleRender();
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
      let clickedObjects = [];
      // reverse loop to get the top object first
      for (let i = objects.length - 1; i >= 0; i--) {
        const object = objects[i];
        if (shaper.isPointInShapeSpot(x, y, object)) {
          this.isSizing = shaper.isPointInShapeSpot(x, y, object);
          break;
        } else if (shaper.isPointInShape(x, y, object)) {
          clickedObjects.push(object);
        }
      }

      if (clickedObjects.length > 0) {
        if (clickedObjects.length > 1) {
          // Rotate through the clicked objects
          const currentIndex = clickedObjects.findIndex(
            (obj) => obj.id === this.store.getActiveObject()?.id
          );
          const nextIndex = (currentIndex + 1) % clickedObjects.length;
          const nextObject = clickedObjects[nextIndex];
          this.store.setActiveObject(nextObject, {
            offsetX: x - nextObject.properties.x,
            offsetY: y - nextObject.properties.y,
          });
        } else {
          const object = clickedObjects[0];
          this.store.setActiveObject(object, {
            offsetX: x - object.properties.x,
            offsetY: y - object.properties.y,
          });
        }
        this.isDragging = true;
        this.setCursor("grabbing");
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
      this.scheduleRender();
    } else if (activeObject) {
      if (this.isDragging) {
        activeObject.properties.x = x - (activeObject.offsetX || 0);
        activeObject.properties.y = y - (activeObject.offsetY || 0);
        this.scheduleRender();
      } else if (this.isSizing) {
        shaper.updateShapeOnMouseEvent(activeObject, this.isSizing, {
          x,
          y,
        });
        this.scheduleRender();
      } else {
        const spot = shaper.isPointInShapeSpot(x, y, activeObject);
        if (spot) {
          this.setCursor(`${spot}-resize`);
        }
      }
    }
  }

  handleMouseUp(event) {
    const activeObject = this.store.getActiveObject();
    const newShapePlaceholder = this.store.getNewShapePlaceholder();
    if (this.isDragging && newShapePlaceholder) {
      this.store.addShape(newShapePlaceholder.type, newShapePlaceholder);
    } else if ((this.isDragging || this.isSizing) && activeObject) {
      const { id, properties } = activeObject;
      this.store.updateActiveObjectProps(id, properties);
    }
    this.setCursor("default");
    this.isDragging = false;
    this.isSizing = "";
    this.store.clearNewShapePlaceholder();
  }

  handleCanvasClick(event) {
    const { x, y } = this.getMousePosition(event);
    const objects = this.store.getObjects();
    const selectedObjectsIds = this.store.getSelectedObjectIds();
    let clicked = false;
    for (let i = objects.length - 1; i >= 0; i--) {
      const object = objects[i];
      if (shaper.isPointInShape(x, y, object) && !selectedObjectsIds.includes(object.id)) {
        if (event.shiftKey) {
          this.store.toggleObjectSelection(object.id);
        }
        clicked = true;
        break;
      }
    }
    if (!clicked && selectedObjectsIds.length > 0) {
      this.store.cleanAllSelections();
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
    const selectedObjectsIds = this.store.getSelectedObjectIds();
    const drawSelection =
      (selectedObjectsIds.length > 0 && !activeObject) ||
      selectedObjectsIds.length > 1;
    if (drawSelection) {
      objects.forEach((object) => {
        shaper.drawShape({ context: this.context, shape: object });
        if (selectedObjectsIds.includes(object.id)) {
          shaper.drawOutline({
            context: this.context,
            shape: object,
            scale: this.scale,
            withoutSpots: true,
          });
        }
      });
    } else {
      objects.forEach((object) => {
        if (object.id !== activeObject?.id) {
          shaper.drawShape({ context: this.context, shape: object });
        }
      });
      if (activeObject) {
        shaper.drawShape({ context: this.context, shape: activeObject });
        shaper.drawOutline({
          context: this.context,
          shape: activeObject,
          scale: this.scale,
        });
      }
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

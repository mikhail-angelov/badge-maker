import commands from "../core/commands/index.js";
import shaper from "../store/shaper.js";

class Canvas {
  constructor(canvasElement, store) {
    this.store = store;
    this.store.on('stateChange',this.scheduleRender.bind(this));
    this.canvas = canvasElement;
    this.context = this.canvas.getContext("2d");
    this.scale = 1;
    this.renderScheduled = false;

    this.isDragging = false;
    this.isSizing = "";
    this.selection = null;

    this.canvas.addEventListener("click", this.handleCanvasClick.bind(this));
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener("wheel", this.handleWheel.bind(this));
    this.canvas.addEventListener("keydown", this.handleKeyDown.bind(this));

    // Add focus to the canvas when clicked
    this.canvas.addEventListener("click", () => {
      this.canvas.focus();
    });

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

    if (event.shiftKey) {
      return;
    }

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
          return;
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
      } else {
        this.selection = { x1: x, y1: y, x2: x, y2: y };
      }
      if (clickedObjects.length === 0 && !this.isSizing) {
        this.store.cleanAllSelections();
      }
    }
  }

  handleMouseMove(event) {
    const activeObject = this.store.getActiveObject();
    const newShapePlaceholder = this.store.getNewShapePlaceholder();
    if (!activeObject && !newShapePlaceholder && !this.selection) {
      return;
    }
    const { x, y } = this.getMousePosition(event);

    if (newShapePlaceholder) {
      newShapePlaceholder.width = x - newShapePlaceholder.x;
      newShapePlaceholder.height = y - newShapePlaceholder.y;
      this.scheduleRender();
    } else if (this.selection) {
      this.selection.x2 = x;
      this.selection.y2 = y;
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
      commands.createShapeCommand({
        store: this.store,
        shapeType: newShapePlaceholder.type,
        properties: newShapePlaceholder,
      });
    } else if ((this.isDragging || this.isSizing) && activeObject) {
      const { id, properties } = activeObject;
      commands.updateObjectCommand({
        store: this.store,
        objectId: id,
        properties,
      });
    } else if (this.selection) {
      this.store.selectedObjectsInRect(this.selection);
    }

    this.setCursor("default");
    this.isDragging = false;
    this.isSizing = "";
    this.selection = null;
    this.store.clearNewShapePlaceholder();
  }

  handleCanvasClick(event) {
    const { x, y } = this.getMousePosition(event);
    const objects = this.store.getObjects();
    const selectedObjectsIds = this.store.getSelectedObjectIds();
    if (event.shiftKey) {
      for (let i = objects.length - 1; i >= 0; i--) {
        const object = objects[i];
        if (shaper.isPointInShape(x, y, object)) {
          this.store.toggleObjectSelection(object.id);
        }
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

  handleKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "z") {
      this.store.restoreFromHistory(this.store.getHistory().length - 2);
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "c") {
      this.store.copySelectedObjects();
    }
    if ((event.ctrlKey || event.metaKey) && event.key === "v") {
      this.store.pasteCopiedObjects();
    }
    if (
      event.key === "ArrowUp" ||
      event.key === "ArrowDown" ||
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight"
    ) {
      this.store.moveActiveObject({
        direction: event.key,
        shiftKey: event.shiftKey,
      });
    }
    if (event.key === "Delete" || event.key === "Backspace"){
      event.preventDefault();
      const activeObject = this.store.getActiveObject();
      if (activeObject) {
        commands.removeObjectCommand({
          store: this.store,
          objectId: activeObject.id,
        });
      }
    }
    if (event.key === "Escape") {
      this.store.clearNewShapePlaceholder();
      this.store.cleanAllSelections();
      this.setCursor("default");
    }
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
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
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
    if (this.selection) {
      this.drawSelectionRectangle();
    }
    this.context.restore();
  }

  drawNewShape({ x, y, width, height }) {
    this.context.strokeStyle = "lightblue";
    this.context.lineWidth = 1;
    this.context.strokeRect(x, y, width, height);
  }

  drawSelectionRectangle() {
    const { x1, y1, x2, y2 } = this.selection;
    const width = x2 - x1;
    const height = y2 - y1;

    this.context.strokeStyle = "blue";
    this.context.lineWidth = 1;
    this.context.setLineDash([5, 5]);
    this.context.strokeRect(x1, y1, width, height);
    this.context.setLineDash([]);
  }

  setCursor(cursorType) {
    this.canvas.style.cursor = cursorType;
  }

  exportAsPNG() {
    // Get all objects from the store
    const objects = this.store.getObjects();
    
    // Scale factor for higher resolution (8x as requested)
    const scaleFactor = 8;
    
    if (objects.length === 0) {
      // If no objects, export the entire canvas at higher resolution
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = this.canvas.width * scaleFactor;
      tempCanvas.height = this.canvas.height * scaleFactor;
      const tempContext = tempCanvas.getContext('2d');
      
      // Scale the context for higher resolution
      tempContext.scale(scaleFactor, scaleFactor);
      
      // Draw the current canvas content
      tempContext.drawImage(this.canvas, 0, 0);
      
      const dataURL = tempCanvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = "canvas.png";
      link.click();
      return;
    }
    
    // Calculate the bounding box of all objects
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    
    objects.forEach(object => {
      const box = shaper.shapeBoxMap[object.type](object.properties);
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.width);
      maxY = Math.max(maxY, box.y + box.height);
    });
    
    // Add some padding around the objects
    const padding = 10;
    const bounds = {
      x: Math.floor(minX - padding),
      y: Math.floor(minY - padding),
      width: Math.ceil(maxX - minX + padding * 2),
      height: Math.ceil(maxY - minY + padding * 2)
    };
    
    // Ensure bounds are valid (positive dimensions)
    if (bounds.width <= 0 || bounds.height <= 0) {
      bounds.width = Math.max(bounds.width, 1);
      bounds.height = Math.max(bounds.height, 1);
    }
    
    // Create a temporary canvas with the cropped dimensions scaled up
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = bounds.width * scaleFactor;
    tempCanvas.height = bounds.height * scaleFactor;
    const tempContext = tempCanvas.getContext('2d');
    
    // Scale the context for higher resolution
    tempContext.scale(scaleFactor, scaleFactor);
    
    // Clear to transparent (instead of white background)
    tempContext.clearRect(0, 0, bounds.width, bounds.height);
    
    // Translate the context to draw objects relative to the bounds
    tempContext.translate(-bounds.x, -bounds.y);
    
    // Draw all objects onto the temporary canvas
    objects.forEach(object => {
      shaper.drawShape({ context: tempContext, shape: object });
    });
    
    // Export the temporary canvas as PNG
    const dataURL = tempCanvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "canvas.png";
    link.click();
  }
}

export default Canvas;

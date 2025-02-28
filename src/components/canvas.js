import renderer from "../store/renderer.js";

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
    this.newShapePlaceholder = null;
    this.selectedColor = "#000000";
    this.imageToLoad = null;

    this.canvas.addEventListener("click", this.handleCanvasClick.bind(this));
    this.canvas.addEventListener("mousedown", this.handleMouseDown.bind(this));
    this.canvas.addEventListener("mousemove", this.handleMouseMove.bind(this));
    this.canvas.addEventListener("mouseup", this.handleMouseUp.bind(this));
    this.canvas.addEventListener("wheel", this.handleWheel.bind(this));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Delete" ) {
        event.preventDefault();
        const selectedObject = this.store.getSelectedObject();
        if (selectedObject) {
          this.store.removeObject(selectedObject.id);
        }
      } else if (event.key === "Escape") {
        this.newShapePlaceholder = null;
        this.draggedObject = null;
        this.setCursor("default");
      }
    });
    document.querySelectorAll(".tool-button").forEach((button) => {
      button.addEventListener("click", (event) => {
        this.newShapePlaceholder = {
          type: event.target.dataset.shape,
        };
        this.setCursor("crosshair");
      });
    });
    document
      .getElementById("color-picker")
      .addEventListener("input", (event) => {
        this.selectedColor = event.target.value;
      });

    document.getElementById("load-image").addEventListener("click", () => {
      document.getElementById("image-loader").click();
    });

    document
      .getElementById("image-loader")
      .addEventListener("change", (event) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              this.newShapePlaceholder = {
                type: "image",
                imageSrc: img.src,
              };
              this.setCursor("crosshair");
            };
            img.src = e.target.result;
          };
          reader.readAsDataURL(file);
        }
      });
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

    if (this.newShapePlaceholder) {
      this.isDragging = true;
      this.newShapePlaceholder.x = x;
      this.newShapePlaceholder.y = y;
    } else {
      const objects = this.store.getObjects();
      for (const object of objects) {
        if (renderer.isPointInShape(x, y, object)) {
          this.isDragging = true;
          if (object.type === "image") {
            const { image, ...rest } = object;
            this.draggedObject = structuredClone({ ...rest });
            this.draggedObject.image = image;
          } else {
            this.draggedObject = structuredClone(object);
          }
          this.offsetX = x - object.properties.x;
          this.offsetY = y - object.properties.y;
          this.store.selectObject(object);
          this.setCursor("grabbing");
          break;
        }
      }
    }
  }

  handleMouseMove(event) {
    if (!this.isDragging) {
      return;
    }
    const { x, y } = this.getMousePosition(event);

    if (this.newShapePlaceholder) {
      this.newShapePlaceholder.width = x - this.newShapePlaceholder.x;
      this.newShapePlaceholder.height = y - this.newShapePlaceholder.y;
    } else if (this.draggedObject) {
      this.draggedObject.properties.x = x - this.offsetX;
      this.draggedObject.properties.y = y - this.offsetY;
    }
    this.scheduleRender();
  }

  handleMouseUp(event) {
    if (this.isDragging && this.newShapePlaceholder) {
      this.store.addShape(this.newShapePlaceholder.type, {
        ...this.newShapePlaceholder,
        color: this.selectedColor,
      });
    } else if (this.isDragging && this.draggedObject) {
      const { id, properties } = this.draggedObject;
      this.store.updateProps(id, properties);
    }
    this.setCursor("default");
    this.isDragging = false;
    this.draggedObject = null;
    this.newShapePlaceholder = null;
  }

  handleCanvasClick(event) {
    const { x, y } = this.getMousePosition(event);
    const objects = this.store.getObjects();
    for (const object of objects) {
      if (renderer.isPointInShape(x, y, object)) {
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
    const selectedObject = this.store.getSelectedObject();
    objects.forEach((object) => {
      const drawOutline = object.id === selectedObject?.id;
      let effectiveObject = object;
      if (drawOutline && this.draggedObject) {
        effectiveObject = this.draggedObject;
      }
      renderer.drawShape(this.context, effectiveObject);
      if (drawOutline) {
        renderer.drawOutline(this.context, effectiveObject);
      }
    });
    if (this.newShapePlaceholder) {
      this.drawNewShape(this.newShapePlaceholder);
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

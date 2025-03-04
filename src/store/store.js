import shaper from "./shaper.js";

class Shape {
  constructor(id, type, properties) {
    this.id = id;
    this.type = type;
    this.properties = properties;
  }
}
class Store {
  constructor(db) {
    this.objects = [];
    this.listeners = [];
    this.history = [];
    this.historyIndex = -1;
    this.selectedObjectsIds = [];
    this.db = db;
    this.activeObject = null;
    this.newShapePlaceholder = null;

    this.initDB();
  }

  async initDB() {
    try {
      await this.db.initDB();
      const objects = await this.db.loadObjects();
      this.objects = this.loadObjects(objects);
      this.pushToHistory("update");
      this.notify();
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  loadObjects(objects) {
    //load images
    return objects.map((item) => {
      if (item.type === "image") {
        const image = new Image();
        image.src = item.properties.imageSrc;
        item.image = image;
      }
      return item;
    });
  }

  async saveObject(object) {
    try {
      const { id, type, properties } = object;
      await this.db.saveObject({ id, type, properties });
    } catch (error) {
      console.error(`Error saving object with id ${object.id}:`, error);
    }
  }
  async saveAllObjects() {
    try {
      await this.db.saveObjects(objects);
    } catch (error) {
      console.error(`Error saving all objects:`, error);
    }
  }

  async deleteObject(id) {
    try {
      await this.db.deleteObject(id);
    } catch (error) {
      console.error(`Error deleting object with id ${id}:`, error);
    }
  }
  removeObject(objectId) {
    this.objects = this.objects.filter((obj) => obj.id !== objectId);
    this.deleteObject(objectId);
    this.selectedObjectsIds = this.selectedObjectsIds.filter(
      (obj) => obj.id !== objectId
    );
    this.activeObject = null;
    this.pushToHistory("remove");
    this.notify();
  }

  async clearObjects() {
    try {
      this.objects = [];
      this.selectedObjectsIds = [];
      await this.db.deleteAllObjects();
      this.history = [];
      this.historyIndex = -1;
      this.notify();
    } catch (error) {
      console.error(`Error clearing all objects:`, error);
    }
  }

  async replaceObjects(objects) {
    try {
      this.selectedObjectsIds = [];
      await this.db.deleteAllObjects();
      await this.db.saveObjects(objects);
      this.objects = this.loadObjects(objects);
      this.pushToHistory("update");
      this.notify();
    } catch (error) {
      console.error(`Error replacing objects:`, error);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    if (this.notifyTimeout) {
      clearTimeout(this.notifyTimeout);
    }
    this.notifyTimeout = setTimeout(() => {
      this.listeners.forEach((listener) => listener(this.objects));
      this.notifyTimeout = null;
    }, 0);
  }

  addShape(type, properties) {
    let shape;
    const id = Date.now();

    switch (type) {
      case "rectangle":
        shape = new Shape(id, "rectangle", {
          x: 240,
          y: 240,
          width: 100,
          height: 100,
          color: "blue",
          ...properties,
        });
        break;
      case "image":
        shape = new Shape(id, "image", {
          x: 240,
          y: 240,
          width: 100,
          height: 100,
          ...properties,
        });
        //load image
        const image = new Image();
        image.src = shape.properties.imageSrc;
        shape.image = image;
        break;
      case "circle":
        shape = new Shape(id, "circle", {
          x: properties.x + properties.width / 2,
          y: properties.y + properties.height / 2,
          radius: Math.min(properties.width, properties.height) / 2,
          color: properties.color || "red",
        });
        break;
      case "text":
        shape = new Shape(id, "text", {
          x: properties.x,
          y: properties.y,
          text: "lorem ipsum",
          fontFamily: "Arial",
          fontSize: 18,
          color: properties.color || "black",
          rotation: 0,
        });
        break;
      case "circle-text":
        shape = new Shape(id, "circle-text", {
          x: properties.x + properties.width / 2,
          y: properties.y + properties.height / 2,
          radius: Math.min(properties.width, properties.height) / 2,
          color: properties.color || "red",
          text: "lorem ipsum",
          fontFamily: "Arial",
          fontSize: 18,
          startAngle: 0,
          kerning: 0,
        });
        break;
      default:
        throw new Error("Unknown shape type");
    }

    this.objects = [...this.objects, shape];
    this.saveObject(shape);
    this.pushToHistory("add");
    this.notify();
  }

  updateActiveObjectProps(id, properties) {
    if (!this.activeObject) {
      return;
    }
    this.activeObject = {
      ...this.activeObject,
      properties: { ...this.activeObject.properties, ...properties },
    };
    this.saveObject({ id, type: this.activeObject.type, properties });
    this.objects = this.objects.map((obj) =>
      obj.id === id
        ? { ...obj, properties: { ...obj.properties, ...properties } }
        : obj
    );
    this.pushToHistory("update");
    this.notify();
  }

  pushToHistory(action) {
    this.history.push({ action, items: [...this.objects] });
    this.historyIndex = this.history.length - 1;
  }
  restoreFromHistory(index) {
    if (index >= 0 && index < this.history.length) {
      this.historyIndex = index;
      this.objects = this.history[index].items;
      this.selectedObjectsIds = [];
      this.saveAllObjects();
      this.notify();
    }
  }

  getObjects() {
    return this.objects;
  }

  getSelectedObjectIds() {
    return this.selectedObjectsIds;
  }

  getHistory() {
    return this.history;
  }
  getHistoryIndex() {
    return this.historyIndex;
  }

  getActiveObject() {
    return this.activeObject;
  }

  setActiveObject(object, offset = {}) {
    this.cleanAllSelections();
    const { id, type, properties, ...rest } = object;
    const activeObject = structuredClone({ id, type, properties });
    this.activeObject = { ...activeObject, ...rest, ...offset };
    this.toggleObjectSelection(object.id);
    this.notify();
  }

  getNewShapePlaceholder() {
    return this.newShapePlaceholder;
  }

  setNewShapePlaceholder(placeholder) {
    this.newShapePlaceholder = placeholder;
    this.notify();
  }

  clearNewShapePlaceholder() {
    this.newShapePlaceholder = null;
    this.notify();
  }

  toggleObjectSelection(id) {
    if (!this.selectedObjectsIds.includes(id)) {
      this.selectedObjectsIds.push(id);
    } else {
      this.selectedObjectsIds = this.selectedObjectsIds.filter(
        (item) => item !== id
      );
    }
    this.notify();
  }

  cleanAllSelections() {
    this.selectedObjectsIds = [];
    this.activeObject = null;
    this.notify();
  }

  alignSelectedObjects(alignment) {
    const selectedObjects = this.objects.filter((object) =>
      this.selectedObjectsIds.includes(object.id)
    );
    const updateObjects = shaper.alignObjects(selectedObjects, alignment);
    this.objects = this.objects.map((obj) => {
      const updateObject = updateObjects.find(
        (updateObj) => updateObj.id === obj.id
      );
      if (updateObject) {
        const o = { ...obj, properties: updateObject.properties };
        this.saveObject(o);
        return o;
      }
      return obj;
    });

    this.pushToHistory("update");
    this.notify();
  }

  moveToFront(objectId) {
    const index = this.objects.findIndex((obj) => obj.id === objectId);
    if (index > -1) {
      const object = this.objects[index];
      this.objects = [
        ...this.objects.slice(0, index),
        ...this.objects.slice(index + 1),
        object,
      ];
      this.notify();
    }
  }

  moveToBack(objectId) {
    const index = this.objects.findIndex((obj) => obj.id === objectId);
    if (index > -1) {
      const object = this.objects[index];
      this.objects = [
        object,
        ...this.objects.slice(0, index),
        ...this.objects.slice(index + 1),
      ];
      this.notify();
    }
  }
  copySelectedObjects() {
    if (this.selectedObjectsIds.length === 0) {
      alert("No objects to copy");
      return;
    }
    const copiedObjects = this.objects.filter((object) =>
      this.selectedObjectsIds.includes(object.id)
    );
    this.copiedObjects = copiedObjects.map((object) => {
      const id = Date.now();
      return {
        id,
        type: object.type,
        properties: { ...object.properties, x: object.properties.x + 10 },
      };
    });
  }
  pastCopiedObjects() {
    if (!this.copiedObjects) {
      alert("No objects to paste");
      return;
    }
    this.objects = [...this.objects, ...this.loadObjects(this.copiedObjects)];
    this.saveAllObjects();
    this.pushToHistory("add");
    this.notify();
  }
  moveActiveObject({ direction, shiftKey }) {
    if (!this.activeObject) {
      return;
    }
    const { x, y } = this.activeObject.properties;
    const step = shiftKey ? 10 : 1;
    switch (direction) {
      case "ArrowUp":
        this.updateActiveObjectProps(this.activeObject.id, { y: y - step });
        break;
      case "ArrowDown":
        this.updateActiveObjectProps(this.activeObject.id, { y: y + step });
        break;
      case "ArrowLeft":
        this.updateActiveObjectProps(this.activeObject.id, { x: x - step });
        break;
      case "ArrowRight":
        this.updateActiveObjectProps(this.activeObject.id, { x: x + step });
        break;
      default:
        break;
    }
  }
  selectedObjectsInRect(rect) {
    try {
      const { x1, y1, x2, y2 } = rect;
      const minX = Math.min(x1, x2);
      const minY = Math.min(y1, y2);
      const maxX = Math.max(x1, x2);
      const maxY = Math.max(y1, y2);

      this.selectedObjectsIds = this.objects
        .filter((object) =>
          shaper.isShapeInRect(object, {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
          })
        )
        .map((object) => object.id);
      this.notify();
    } catch (e) {
      console.error("selectedObjectsInRect", e);
    }
  }
}

export default Store;

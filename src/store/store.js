import shaper from "./shaper.js";
import { Observable } from "./observable.js";
import { ImmutablePersistedCollection } from './immutablePersistedCollection.js';

class Shape extends Observable{
  constructor(id, type, properties) {
    this.id = id;
    this.type = type;
    this.properties = properties;
  }
}
class Store extends Observable {
  constructor(db) {
    super();
    this.collection = new ImmutablePersistedCollection(db);
    this.objects = [];
    this.history = [];
    this.historyIndex = -1;
    this.selectedObjectsIds = [];
    this.activeObject = null;
    this.newShapePlaceholder = null;

    this.initDB();
  }

  async initDB() {
    try {
      this.objects = await this.collection.init();
      this.pushToHistory("update");
      this.notify();
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  async addShape(type, properties) {
    const shape = createShape(type, properties); // Move shape creation to helper
    this.objects = await this.collection.add(shape);
    this.pushToHistory("add");
    this.notify();
  }

  async updateActiveObjectProps(id, properties) {
    if (!this.activeObject) return;
    
    this.activeObject = {
      ...this.activeObject,
      properties: { ...this.activeObject.properties, ...properties },
    };
    
    this.objects = await this.collection.update(id, {
      type: this.activeObject.type,
      properties: this.activeObject.properties
    });
    
    this.pushToHistory("update");
    this.notify();
  }

  pushToHistory(action) {
    this.history.push({ action, items: this.objects });
    this.historyIndex = this.history.length - 1;
  }
  restoreFromHistory(index) {
    if (index >= 0 && index < this.history.length) {
      this.historyIndex = index;
      this.objects = this.history[index].items;
      this.history = this.history.slice(0, index);
      this.collection.replaceAll(this.objects);
      this.selectedObjectsIds = [];
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

  async alignSelectedObjects(alignment) {
    const selectedObjects = this.objects.filter((object) =>
      this.selectedObjectsIds.includes(object.id)
    );
    const updateObjects = shaper.alignObjects(selectedObjects, alignment);
    await this.collection.updateMany(updateObjects)
    this.objects = this.collection.getAll();

    this.pushToHistory("update");
    this.notify();
  }

  async moveToFront(objectId) {
      const index = this.objects.findIndex((obj) => obj.id === objectId);
      if (index > -1) {
        const object = this.objects[index];
        const reorderedObjects = [
          ...this.objects.slice(0, index),
          ...this.objects.slice(index + 1),
          object,
        ];
        this.objects = await this.collection.replace(reorderedObjects);
        this.notify();
      }
    }
  
    async moveToBack(objectId) {
      const index = this.objects.findIndex((obj) => obj.id === objectId);
      if (index > -1) {
        const object = this.objects[index];
        const reorderedObjects = [
          object,
          ...this.objects.slice(0, index),
          ...this.objects.slice(index + 1),
        ];
        this.objects = await this.collection.replace(reorderedObjects);
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
    this.copiedObjects = copiedObjects.map((object) => ({
      id: Date.now() + Math.random(), // Ensure unique IDs for multiple copies
      type: object.type,
      properties: { ...object.properties, x: object.properties.x + 10 },
    }));
  }

  async pasteCopiedObjects() {
    if (!this.copiedObjects) {
      alert("No objects to paste");
      return;
    }

    const addPromises = this.copiedObjects.map(object => 
      this.collection.add(object)
    );
    
    try {
      await Promise.all(addPromises);
      this.objects = this.collection.getAll();
      this.pushToHistory("add");
      this.notify();
    } catch (error) {
      console.error("Error pasting objects:", error);
    }
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

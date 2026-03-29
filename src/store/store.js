import shaper from "./shaper.js";
import { Observable } from "./observable.js";
import { ImmutablePersistedCollection } from './immutablePersistedCollection.js';
import { buildStateSummary } from "../core/roles/buildStateSummary.js";

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

  cloneObjects(objects = this.objects) {
    return structuredClone(
      objects.map(({ image, rect, ...object }) => object)
    );
  }

  createSnapshot() {
    return this.cloneObjects();
  }

  async initDB() {
    try {
      this.objects = await this.collection.init();
      this.pushToHistory("update");
      super.emit('stateChange');
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  async addShape(type, properties, options = {}) {
    const shape = shaper.createShape(type, properties); // Move shape creation to helper
    this.objects = await this.collection.add(shape);
    if (options.recordHistory !== false) {
      this.pushHistoryEntry(options.historyAction || "add");
    }
    if (options.emitStateChange !== false) {
      super.emit('stateChange');
    }
    return shape;
  }

  async updateObjectProps(id, properties, options = {}) {
    return this.updateObject(id, { properties }, options);
  }

  async updateActiveObjectProps(id, properties, options = {}) {
    if (!this.activeObject) return null;
    return this.updateObjectProps(id, properties, options);
  }

  pushHistoryEntry(action, items = this.createSnapshot()) {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push({ action, items });
    this.historyIndex = this.history.length - 1;
  }

  pushToHistory(action) {
    this.pushHistoryEntry(action);
  }
  async restoreFromHistory(index) {
    if (index >= 0 && index < this.history.length) {
      const restoredObjects = this.cloneObjects(this.history[index].items);
      this.historyIndex = index;
      this.objects = await this.collection.replace(restoredObjects);
      this.history = this.history.slice(0, index + 1);
      this.selectedObjectsIds = [];
      this.activeObject = null;
      super.emit('stateChange');
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

  getObjectById(id) {
    return this.objects.find((object) => object.id === id) || null;
  }

  getStateSummary() {
    return buildStateSummary({
      objects: this.objects,
      selectedObjectIds: this.selectedObjectsIds,
      activeObjectId: this.activeObject?.id || null,
    });
  }

  syncActiveObject(id = this.activeObject?.id) {
    if (!id) {
      this.activeObject = null;
      return;
    }

    const object = this.getObjectById(id);
    if (!object) {
      this.activeObject = null;
      return;
    }

    const { properties, ...rest } = object;
    this.activeObject = {
      ...rest,
      properties: structuredClone(properties),
    };
  }

  setActiveObject(object, offset = {}) {
    this.selectObjects([object.id], object.id, offset);
  }

  selectObjects(ids, activeObjectId = null, offset = {}) {
    this.selectedObjectsIds = [...ids];

    if (activeObjectId != null) {
      const object = this.getObjectById(activeObjectId);
      if (object) {
        const { id, type, properties, ...rest } = object;
        const activeObject = structuredClone({ id, type, properties });
        this.activeObject = { ...activeObject, ...rest, ...offset };
      } else {
        this.activeObject = null;
      }
    } else {
      this.activeObject = null;
    }

    super.emit('stateChange');
  }

  getNewShapePlaceholder() {
    return this.newShapePlaceholder;
  }

  setNewShapePlaceholder(placeholder) {
    this.newShapePlaceholder = placeholder;
    super.emit('stateChange');
  }

  clearNewShapePlaceholder() {
    this.newShapePlaceholder = null;
    super.emit('stateChange');
  }

  async replaceObjects(objects, options = {}) {
    this.objects = await this.collection.replace(objects);
    if (options.recordHistory !== false) {
      this.pushHistoryEntry(options.historyAction || "update");
    }
    this.selectedObjectsIds = [];
    this.activeObject = null;
    if (options.emitStateChange !== false) {
      super.emit('stateChange');
    }
  }

  async clearObjects(options = {}) {
    this.objects = await this.collection.clear();
    if (options.recordHistory !== false) {
      this.pushHistoryEntry(options.historyAction || "remove");
    }
    this.selectedObjectsIds = [];
    this.activeObject = null;
    if (options.emitStateChange !== false) {
      super.emit('stateChange');
    }
  }

  toggleObjectSelection(id) {
    if (!this.selectedObjectsIds.includes(id)) {
      this.selectedObjectsIds.push(id);
    } else {
      this.selectedObjectsIds = this.selectedObjectsIds.filter(
        (item) => item !== id
      );
    }
    super.emit('stateChange');
  }

  cleanAllSelections() {
    this.selectedObjectsIds = [];
    this.activeObject = null;
    super.emit('stateChange');
  }

  setSelectedObjectIds(ids) {
    this.selectedObjectsIds = [...ids];
    if (!ids.includes(this.activeObject?.id)) {
      this.activeObject = null;
    }
    super.emit('stateChange');
  }

  async updateObject(id, updates, options = {}) {
    const object = this.getObjectById(id);
    if (!object) {
      return null;
    }

    const nextObject = {
      ...object,
      ...updates,
      properties: {
        ...object.properties,
        ...(updates.properties || {}),
      },
    };

    this.objects = await this.collection.update(id, nextObject);

    if (this.activeObject?.id === id) {
      this.syncActiveObject(id);
    }
    if (options.recordHistory !== false) {
      this.pushHistoryEntry(options.historyAction || "update");
    }
    if (options.emitStateChange !== false) {
      super.emit('stateChange');
    }

    return this.getObjectById(id);
  }

  async alignObjectIds(objectIds, alignment, options = {}) {
    const selectedObjects = this.objects.filter((object) =>
      objectIds.includes(object.id)
    );
    if (selectedObjects.length === 0) {
      return [];
    }
    const updateObjects = shaper.alignObjects(selectedObjects, alignment);
    await this.collection.updateMany(updateObjects);
    this.objects = this.collection.getAll();

    if (this.activeObject) {
      this.syncActiveObject();
    }
    if (options.recordHistory !== false) {
      this.pushHistoryEntry(options.historyAction || "update");
    }
    if (options.emitStateChange !== false) {
      super.emit('stateChange');
    }

    return updateObjects;
  }

  async alignSelectedObjects(alignment, options = {}) {
    return this.alignObjectIds(this.selectedObjectsIds, alignment, options);
  }

  async moveToFront(objectId, options = {}) {
    const index = this.objects.findIndex((obj) => obj.id === objectId);
    if (index === -1) {
      return false;
    }

    const object = this.objects[index];
    const reorderedObjects = [
      ...this.objects.slice(0, index),
      ...this.objects.slice(index + 1),
      object,
    ];
    this.objects = await this.collection.replace(reorderedObjects);
    this.syncActiveObject(objectId);

    if (options.recordHistory !== false) {
      this.pushHistoryEntry(options.historyAction || "update");
    }
    if (options.emitStateChange !== false) {
      super.emit('stateChange');
    }

    return true;
  }

  async moveToBack(objectId, options = {}) {
    const index = this.objects.findIndex((obj) => obj.id === objectId);
    if (index === -1) {
      return false;
    }

    const object = this.objects[index];
    const reorderedObjects = [
      object,
      ...this.objects.slice(0, index),
      ...this.objects.slice(index + 1),
    ];
    this.objects = await this.collection.replace(reorderedObjects);
    this.syncActiveObject(objectId);

    if (options.recordHistory !== false) {
      this.pushHistoryEntry(options.historyAction || "update");
    }
    if (options.emitStateChange !== false) {
      super.emit('stateChange');
    }

    return true;
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
      type: object.type,
      properties: { ...object.properties },
    }));
  }

  async pasteCopiedObjects() {
    if (!this.copiedObjects) {
      alert("No objects to paste");
      return;
    }
    const pastedObjects = this.copiedObjects.map((object) => ({
      ...object,
      id: Date.now() + Math.random(),
      properties: {
        ...object.properties,
        x: (object.properties.x || 0) + 10,
        y: (object.properties.y || 0) + 10,
      },
    }));

    const addPromises = pastedObjects.map(object => 
      this.collection.add(object)
    );
    
    try {
      await Promise.all(addPromises);
      this.objects = this.collection.getAll();
      this.pushHistoryEntry("add");
      super.emit('stateChange');
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
      super.emit('stateChange');
    } catch (e) {
      console.error("selectedObjectsInRect", e);
    }
  }

  async removeObject(objectId, options = {}) {
    if (!this.getObjectById(objectId)) {
      return false;
    }
    this.objects = await this.collection.remove(objectId);
    this.selectedObjectsIds = this.selectedObjectsIds.filter(
      (id) => id !== objectId
    );
    this.activeObject = null;
    if (options.recordHistory !== false) {
      this.pushHistoryEntry(options.historyAction || "remove");
    }
    if (options.emitStateChange !== false) {
      super.emit('stateChange');
    }
    return true;
  }

}

export default Store;

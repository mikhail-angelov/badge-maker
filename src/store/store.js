import { Rectangle, Circle, Text } from "./shapes.js";
import IndexedDBHelper from "./indexedDBHelper.js";

class Store {
  constructor() {
    this.objects = [];
    this.listeners = [];
    this.history = [];
    this.selectedObject = null;
    this.dbHelper = new IndexedDBHelper("BadgeMakerDB", "objects");

    this.initDB();
  }

  async initDB() {
    try {
      await this.dbHelper.initDB();
      this.objects = await this.dbHelper.loadObjects();
      this.notify();
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  async saveObject(object) {
    try {
      await this.dbHelper.saveObject(object);
    } catch (error) {
      console.error(`Error saving object with id ${object.id}:`, error);
    }
  }
  async saveAllObjects() {
    try {
      await Promise.all(
        this.objects.map((item) => this.dbHelper.saveObject(item))
      );
    } catch (error) {
      console.error(`Error saving object with id ${object.id}:`, error);
    }
  }

  async deleteObject(id) {
    try {
      await this.dbHelper.deleteObject(id);
    } catch (error) {
      console.error(`Error deleting object with id ${id}:`, error);
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach((listener) => listener(this.objects));
  }

  addShape(type) {
    let shape;
    const id = Date.now();

    switch (type) {
      case "rect":
        shape = new Rectangle(id, {
          x: 240,
          y: 240,
          width: 100,
          height: 100,
          color: "blue",
        });
        break;
      case "circle":
        shape = new Circle(id, { x: 200, y: 200, radius: 50, color: "red" });
        break;
      case "text":
        shape = new Text(id, {
          x: 200,
          y: 200,
          text: "test",
          fontFamily: "Arial",
          fontSize: "18pt",
          color: "black",
        });
        break;
      default:
        throw new Error("Unknown shape type");
    }

    this.objects = [...this.objects, shape];
    this.history.push({ action: "add", items: this.objects });
    this.saveObject(shape);
    this.notify();
  }

  removeObject(objectId) {
    this.objects = this.objects.filter((obj) => obj.id !== objectId);
    this.history.push({ action: "remove", items: this.objects });
    this.deleteObject(objectId);
    this.selectedObject = null;
    this.notify();
  }

  updateProps(id, properties) {
    this.objects = this.objects.map((obj) =>
      obj.id === id
        ? { ...obj, properties: { ...obj.properties, ...properties } }
        : obj
    );
    this.selectedObject = this.objects.find((obj) => obj.id === id);
    this.saveObject(this.selectedObject);
    this.history.push({ action: "update", items: this.objects });
    this.notify();
  }

  selectObject(object) {
    this.selectedObject = object;
    this.notify();
  }

  restoreFromHistory(index) {
    if (index >= 0 && index < this.history.length) {
      this.objects = this.history[index].items;
      this.selectedObject = null;
      this.saveAllObjects();
      this.notify();
    }
  }

  getObjects() {
    return this.objects;
  }

  getSelectedObject() {
    return this.selectedObject;
  }

  getHistory() {
    return this.history;
  }
}

export default Store;

import IndexedDB from "./IndexedDB.js";

class Shape {
  constructor(id, type, properties) {
    this.id = id;
    this.type = type;
    this.properties = properties;
  }
}
class Store {
  constructor() {
    this.objects = [];
    this.listeners = [];
    this.history = [];
    this.historyIndex = -1;
    this.selectedObject = null;
    this.db = new IndexedDB("BadgeMakerDB", "objects");

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
      await this.saveObjects(this.objects);
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
    this.selectedObject = null;
    this.pushToHistory("remove");
    this.notify();
  }

  async clearObjects() {
    try {
      this.objects = [];
      this.selectedObject = null;
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
      this.selectedObject = null;
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
    this.listeners.forEach((listener) => listener(this.objects));
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
    this.selectedObject = shape;
    this.saveObject(shape);
    this.pushToHistory("add");
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
    this.pushToHistory("update");
    this.notify();
  }

  selectObject(object) {
    this.selectedObject = object;
    console.log("selectedObject", this.selectedObject);
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
  getHistoryIndex() {
    return this.historyIndex;
  }
}

export default Store;

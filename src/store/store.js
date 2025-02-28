import IndexedDBHelper from "./indexedDBHelper.js";

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
    this.dbHelper = new IndexedDBHelper("BadgeMakerDB", "objects");

    this.initDB();
  }

  async initDB() {
    try {
      await this.dbHelper.initDB();
      this.objects = await this.dbHelper.loadObjects();
      //load images
      this.objects = this.objects.map((item) => {
        if (item.type === "image") {
          const image = new Image();
          image.src = item.properties.imageSrc;
          item.image = image;
        }
        return item;
      });
      this.pushToHistory("update");
      this.notify();
    } catch (error) {
      console.error("Error initializing database:", error);
    }
  }

  async saveObject(object) {
    try {
      if (object.type === "image") {
        const { image, ...rest } = object;
        await this.dbHelper.saveObject({ ...rest });
      } else {
        await this.dbHelper.saveObject(object);
      }
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
        const image = new Image();
        image.src = item.properties.imageSrc;
        shape.image = image;

        break;
      case "circle":
        shape = new Shape(id, "circle", {
          x: 200,
          y: 200,
          radius: 50,
          color: "red",
          ...properties,
        });
        break;
      case "text":
        shape = new Shape(id, "text", {
          x: 200,
          y: 200,
          text: "test",
          fontFamily: "Arial",
          fontSize: "18",
          color: "black",
          rotation: 0,
          ...properties,
        });
        break;
      case "circle-text":
        shape = new Shape(id, "circle-text", {
          x: 200,
          y: 200,
          text: "test",
          fontFamily: "Arial",
          fontSize: "18",
          color: "black",
          radius: Math.max(properties.width, properties.height) / 2,
          startAngle: 0,
          kerning: 0,
          ...properties,
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

  removeObject(objectId) {
    this.objects = this.objects.filter((obj) => obj.id !== objectId);
    this.deleteObject(objectId);
    this.selectedObject = null;
    this.pushToHistory("remove");
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

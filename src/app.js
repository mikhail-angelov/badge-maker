import IndexedDB from "./store/indexedDB.js";
import Store from "./store/store.js";
import LeftPanel from "./components/leftPanel.js";
import Canvas from "./components/canvas.js";
import PropertiesPanel from "./components/propertiesPanel.js";
import Footer from "./components/footer.js";
import Tool from "./components/tool.js";

class App {
  constructor() {
    this.db = new IndexedDB("BadgeMakerDB", "objects");
    this.store = new Store(this.db);
    this.leftPanel = new LeftPanel(
      document.getElementById("object-items"),
      this.store
    );
    this.canvas = new Canvas(document.getElementById("canvas"), this.store);
    this.propertiesPanel = new PropertiesPanel(
      document.getElementById("properties-panel"),
      this.store
    );
    this.tool = new Tool(document.getElementById("tool-panel"), this.store);
    this.footer = new Footer(document.getElementById("footer"), this.store);

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.render();
  }

  setupEventListeners() {
    document
      .getElementById("export-png")
      .addEventListener("click", () => this.canvas.exportAsPNG());
    window.addEventListener("resize", () => this.canvas.handleResize());
  }

  render() {
    this.leftPanel.render();
    this.canvas.render();
    this.propertiesPanel.render();
    this.footer.render();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new App();
});

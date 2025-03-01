import Store from './store/store.js';
import LeftPanel from './components/leftPanel.js';
import Canvas from './components/canvas.js';
import PropertiesPanel from './components/propertiesPanel.js';
import Footer from './components/footer.js';

class App {
  constructor() {
    this.store = new Store();
    this.leftPanel = new LeftPanel(document.getElementById('object-items'), this.store);
    this.canvas = new Canvas(document.getElementById('canvas'), this.store);
    this.propertiesPanel = new PropertiesPanel(document.getElementById('properties-panel'), this.store);
    this.footer = new Footer(document.getElementById('footer'), this.store);

    this.init();
  }

  init() {
    this.setupEventListeners();
    this.render();
  }

  setupEventListeners() {
    document.getElementById('remove-shape').addEventListener('click', () => {
      const selectedObject = this.store.getSelectedObject();
      if (selectedObject) {
        this.store.removeObject(selectedObject.id);
      }
    });

    document.getElementById('export-png').addEventListener('click', () => {
      this.canvas.exportAsPNG();
    });

    document.addEventListener('keydown', (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
        this.store.restoreFromHistory(this.store.getHistory().length - 2);
        this.render();
      }
    });
  }

  render() {
    this.leftPanel.render();
    this.canvas.render();
    this.propertiesPanel.render();
    this.footer.render();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App();
});

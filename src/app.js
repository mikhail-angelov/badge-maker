import Store from './store/store.js';
import ObjectList from './components/objectList.js';
import Canvas from './components/canvas.js';
import PropertiesPanel from './components/propertiesPanel.js';

class App {
    constructor() {
        this.store = new Store();
        this.objectList = new ObjectList(document.getElementById('object-items'),this.store);
        this.canvas = new Canvas(document.getElementById('canvas'),this.store);
        this.propertiesPanel = new PropertiesPanel(document.getElementById('properties-panel'),this.store);
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        document.getElementById('add-shape').addEventListener('click', () => {
            const shapeType = prompt('Enter shape type (rect, circle, text):');
            this.store.addShape(shapeType);
        });
        document.getElementById('remove-shape').addEventListener('click', () => {
            const selectedObject = this.store.getSelectedObject();
            if (selectedObject) {
                this.store.removeObject(selectedObject.id);
            }
        });

        document.getElementById('export-png').addEventListener('click', () => {
            this.canvas.exportAsPNG();
        });
    }

    render() {
        this.objectList.render();
        this.canvas.render();
        this.propertiesPanel.render();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});
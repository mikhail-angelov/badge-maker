class PropertiesPanel {
  constructor(container, store) {
    this.store = store;
    this.container = container;
    this.tempProperties = {};
    this.store.subscribe(this.render.bind(this));
  }

  renderSelectedGroup() {
    const selectedObjectsIds = this.store.getSelectedObjectIds();
    this.container.innerHTML = `
      <h2 class="title">Properties</h2>
      <div>Align ${selectedObjectsIds.length} items</div>
      <div class="justify-buttons">
        <button class="justify-button" data-align="center-horizontal">⇔</button>
        <button class="justify-button" data-align="center-vertical">⇕</button>
        <button class="justify-button" data-align="justify-left">⇤</button>
        <button class="justify-button" data-align="justify-right">⇥</button>
        <button class="justify-button" data-align="justify-top">⇡</button>
        <button class="justify-button" data-align="justify-bottom">⇣</button>
      </div>
    `;

    this.container.querySelectorAll(".justify-button").forEach((button) => {
      button.addEventListener("click", (event) => {
        const alignment = event.target.dataset.align;
        this.store.alignSelectedObjects(alignment);
      });
    });
  }

  renderActiveObject() {
    const activeObject = this.store.getActiveObject();
    this.container.innerHTML = `
      <h2 class="title">Properties</h2>
      <button id="remove-shape">Remove</button>
      <div id="properties"></div>
    `;

    const propertiesDiv = this.container.querySelector("#properties");

    this.tempProperties = { ...activeObject.properties };

    for (const [key, value] of Object.entries(this.tempProperties)) {
      const isNumber = typeof value === "number";
      const propertyElement = document.createElement("div");
      propertyElement.innerHTML = `
        <label>${key}</label>
        <input type="${
          isNumber ? "number" : "text"
        }" value="${value}" data-key="${key}" />
      `;
      propertyElement
        .querySelector("input")
        .addEventListener("input", (event) => {
          this.tempProperties[key] = isNumber
            ? +event.target.value
            : event.target.value;
        });
      propertiesDiv.appendChild(propertyElement);
    }

    const applyButton = document.createElement("button");
    applyButton.textContent = "Apply";
    applyButton.addEventListener("click", () => {
      this.store.updateProps(activeObject.id, this.tempProperties);
    });
    propertiesDiv.appendChild(applyButton);

    const removeButton = this.container.querySelector("#remove-shape");
    removeButton.addEventListener("click", () => {
      if (activeObject) {
        this.store.removeObject(activeObject.id);
      }
    });
  }

  render() {
    const selectedObjectsIds = this.store.getSelectedObjectIds();
    if (selectedObjectsIds.length > 1) {
      return this.renderSelectedGroup();
    }
    const activeObject = this.store.getActiveObject();
    if (activeObject) {
      return this.renderActiveObject();
    }
    this.container.innerHTML = `
      <h2 class="title">Properties</h2>
      <div>No item selected</div>
    `;
  }
}

export default PropertiesPanel;

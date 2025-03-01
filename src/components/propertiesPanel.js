const shapePropertiesMap = {
  ["rectangle"]: {
    x: "number",
    y: "number",
    width: "number",
    height: "number",
    border: "number",
    rounded: "number",
    rotate: "number",
    color: "color",
  },
  ["circle"]: {
    x: "number",
    y: "number",
    radius: "number",
    border: "number",
    color: "color",
  },
  ["image"]: {
    x: "number",
    y: "number",
    width: "number",
    height: "number",
    imageSrc: "text",
  },
  ["text"]: {
    x: "number",
    y: "number",
    fontSize: "number",
    rotation: "number",
    text: "text",
    color: "color",
    fontFamily: "fontFamily",
  },
  ["circle-text"]: {
    x: "number",
    y: "number",
    fontSize: "number",
    radius: "number",
    startAngle: "number",
    kerning: "number",
    text: "text",
    textInside: "boolean",
    inwardFacing: "boolean",
    color: "color",
    fontFamily: "fontFamily",
  },
};

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
    const shapeProperties = shapePropertiesMap[activeObject.type];

    for (const [prop, type] of Object.entries(shapeProperties)) {
      const propertyElement = document.createElement("div");
      if (type === "number" || type === "text") {
        const isNumber = prop === "number";
        const value = this.tempProperties[prop] || 0;
        propertyElement.innerHTML = `
        <label>${prop}</label>
        <input type="${
          isNumber ? "number" : "text"
        }" value="${value}" data-key="${prop}" />
      `;
        propertyElement
          .querySelector("input")
          .addEventListener("input", (event) => {
            this.tempProperties[prop] = isNumber
              ? +event.target.value
              : event.target.value;
          });
      } else if (type === "color") {
        const value = this.tempProperties[prop] || "#000000";
        propertyElement.innerHTML = `
        <label>${prop}</label>
        <input type="color" value="${value}" data-key="${prop}" />
      `;
        propertyElement
          .querySelector("input")
          .addEventListener("input", (event) => {
            this.tempProperties[prop] = event.target.value;
          });
      } else if (type === "boolean") {
        const value = this.tempProperties[prop] || false;
        propertyElement.innerHTML = `
        <label>${prop}</label>
        <input type="checkbox" ${value ? "checked" : ""} data-key="${prop}" />
      `;
        propertyElement
          .querySelector("input")
          .addEventListener("input", (event) => {
            this.tempProperties[prop] = event.target.checked;
          });
      } else if (type === "fontFamily") {
        const value = this.tempProperties[prop] || "Arial";
        propertyElement.innerHTML = `
        <label>${prop}</label>
        <select data-key="${prop}">
          <option value="Arial">Arial</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
        </select>
      `;
        propertyElement
          .querySelector("select")
          .addEventListener("change", (event) => {
            this.tempProperties[prop] = event.target.value;
          });
      }
      propertiesDiv.appendChild(propertyElement);
    }

    const applyButton = document.createElement("button");
    applyButton.textContent = "Apply";
    applyButton.addEventListener("click", () => {
      console.log("update", this.tempProperties);
      this.store.updateActiveObjectProps(activeObject.id, this.tempProperties);
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

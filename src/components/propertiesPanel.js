class PropertiesPanel {
  constructor(container, store) {
    this.store = store;
    this.container = container;
    this.tempProperties = {};
    this.store.subscribe(this.render.bind(this));
  }

  render() {
    const selectedObject = this.store.getSelectedObject();
    if (selectedObject) {
      this.container.innerHTML = `
      <h2 class="title">Properties</h2>
      <button id="remove-shape">Remove</button>
      <div id="properties"></div>
    `;

      const propertiesDiv = this.container.querySelector("#properties");

      this.tempProperties = { ...selectedObject.properties };

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
        this.store.updateProps(selectedObject.id, this.tempProperties);
      });
      propertiesDiv.appendChild(applyButton);

      const removeButton = this.container.querySelector("#remove-shape");
      removeButton.addEventListener("click", () => {
        if (selectedObject) {
          this.store.removeObject(selectedObject.id);
        }
      });
    }
  }
}

export default PropertiesPanel;

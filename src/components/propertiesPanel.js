class PropertiesPanel {
  constructor(container, store) {
    this.store = store;
    this.container = container;
    
    this.store.subscribe(() => {
      this.render();
    });
  }

  render() {
    const propertiesDiv = this.container.querySelector("#properties");
    propertiesDiv.innerHTML = "";
    const selectedObject = this.store.getSelectedObject();

    if (selectedObject) {
      for (const [key, value] of Object.entries(selectedObject.properties)) {
        const propertyElement = document.createElement("div");
        propertyElement.innerHTML = `
                    <label>${key}</label>
                    <input type="text" value="${value}" data-key="${key}" />
                `;
        propertyElement
          .querySelector("input")
          .addEventListener("input", (event) => {
            this.store.updateProps(selectedObject.id, {
              ...selectedObject.properties,
              [key]: event.target.value,
            });
          });
        propertiesDiv.appendChild(propertyElement);
      }
    }
  }
}

export default PropertiesPanel;

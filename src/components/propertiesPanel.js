import shaper from "../store/shaper.js";
import { FontFamilyModal } from "./fontFamilyModal.js";

class PropertiesPanel {
  constructor(container, store) {
    this.store = store;
    this.container = container;
    this.tempProperties = {};
    this.store.on('stateChange',this.render.bind(this));
  }

  openFontSelectorModal(currentFont, text) {
    const modalContainer = document.createElement("div");
    modalContainer.className = "modal-container";
    document.body.appendChild(modalContainer);

    fontFamilyModal = new FontFamilyModal(
      modalContainer,
      currentFont,
      text,
      (font) => {
        if (font) {
          const activeObject = this.store.getActiveObject();
          this.tempProperties.fontFamily = font;
          this.store.updateActiveObjectProps(
            activeObject.id,
            this.tempProperties
          );
        }
        document.body.removeChild(modalContainer);
      }
    );
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
      <div class="spread">
        <h2 class="title">Properties</h2>
        <button id="remove-shape">Remove</button>
      </div>
      <div class="row">
        <button id="to-front">To Front</button>
        <div>&nbsp;&nbsp;</div>
        <button id="to-back">To Back</button>
      </div>
      <form class="column" id="properties">
      <p class="type">Type: <b>${activeObject.type}</b></p>
      </form>
    `;

    const form = this.container.querySelector("#properties");

    this.tempProperties = { ...activeObject.properties };
    const shapeProperties = shaper.shapePropertiesMap[activeObject.type];

    for (const [prop, type] of Object.entries(shapeProperties)) {
      const propertyElement = document.createElement("div");
      propertyElement.className = "row";
      if (type === "number" || type === "text") {
        const isNumber = type === "number";
        const value = this.tempProperties[prop] || 0;
        propertyElement.innerHTML = `
        <label class="label">${prop}</label>
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
        <label class="label">${prop}</label>
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
        <label class="label">${prop}</label>
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
        <label class="label">${prop}</label>
        <button type="button" class="font-family-button" data-key="${prop}">${value}</button>
      `;
        propertyElement
          .querySelector(".font-family-button")
          .addEventListener("click", () => {
            this.openFontSelectorModal(value, this.tempProperties.text);
          });
      } else if (type === "image") {
        const value = this.tempProperties.imageSrc || "";
        propertyElement.innerHTML = `
        <label class="label">${prop}</label>
        <img src="${value}" alt="image" width="150">
      `;
      }
      form.appendChild(propertyElement);
    }

    const applyButton = document.createElement("button");
    applyButton.textContent = "Apply";

    form.appendChild(applyButton);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      this.store.updateActiveObjectProps(activeObject.id, this.tempProperties);
    });

    const removeButton = this.container.querySelector("#remove-shape");
    removeButton.addEventListener("click", () => {
      if (activeObject) {
        this.store.removeObject(activeObject.id);
      }
    });

    const toFrontButton = this.container.querySelector("#to-front");
    toFrontButton.addEventListener("click", () => {
      this.store.moveToFront(activeObject.id);
    });

    const toBackButton = this.container.querySelector("#to-back");
    toBackButton.addEventListener("click", () => {
      this.store.moveToBack(activeObject.id);
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

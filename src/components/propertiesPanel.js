import shaper from "../store/shaper.js";
import { FontFamilyModal } from "./fontFamilyModal.js";
import commands from "../core/commands/index.js";

const COLOR_NAME_TO_HEX = {
  black: "#000000",
  white: "#ffffff",
  red: "#ff0000",
  blue: "#0000ff",
  green: "#008000",
  yellow: "#ffff00",
  orange: "#ffa500",
};

const normalizeColorInputValue = (value) => {
  if (typeof value !== "string") {
    return "#000000";
  }

  const normalized = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized;
  }

  return COLOR_NAME_TO_HEX[normalized] || "#000000";
};

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

    new FontFamilyModal(
      modalContainer,
      currentFont,
      text,
      (font) => {
        if (font) {
          const activeObject = this.store.getActiveObject();
          this.tempProperties.fontFamily = font;
          commands.updateObjectCommand({
            store: this.store,
            objectId: activeObject.id,
            properties: this.tempProperties,
          });
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
        commands.alignObjectsCommand({
          store: this.store,
          objectIds: selectedObjectsIds,
          alignment,
        });
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
      const fieldId = `property-${activeObject.id}-${prop}`;
      if (type === "number" || type === "text") {
        const isNumber = type === "number";
        const value = this.tempProperties[prop] ?? (isNumber ? 0 : "");
        propertyElement.innerHTML = `
        <label class="label" for="${fieldId}">${prop}</label>
        <input type="${
          isNumber ? "number" : "text"
        }" id="${fieldId}" name="${prop}" value="${value}" data-key="${prop}" />
      `;
        propertyElement
          .querySelector("input")
          .addEventListener("input", (event) => {
            this.tempProperties[prop] = isNumber
              ? +event.target.value
              : event.target.value;
          });
      } else if (type === "color") {
        const value = normalizeColorInputValue(this.tempProperties[prop]);
        propertyElement.innerHTML = `
        <label class="label" for="${fieldId}">${prop}</label>
        <input type="color" id="${fieldId}" name="${prop}" value="${value}" data-key="${prop}" />
      `;
        propertyElement
          .querySelector("input")
          .addEventListener("input", (event) => {
            this.tempProperties[prop] = event.target.value;
          });
      } else if (type === "boolean") {
        const value = this.tempProperties[prop] || false;
        propertyElement.innerHTML = `
        <label class="label" for="${fieldId}">${prop}</label>
        <input type="checkbox" id="${fieldId}" name="${prop}" ${value ? "checked" : ""} data-key="${prop}" />
      `;
        propertyElement
          .querySelector("input")
          .addEventListener("input", (event) => {
            this.tempProperties[prop] = event.target.checked;
          });
      } else if (type === "fontFamily") {
        const value = this.tempProperties[prop] || "Arial";
        propertyElement.innerHTML = `
        <label class="label" for="${fieldId}">${prop}</label>
        <button type="button" id="${fieldId}" class="font-family-button" data-key="${prop}">${value}</button>
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
      commands.updateObjectCommand({
        store: this.store,
        objectId: activeObject.id,
        properties: this.tempProperties,
      });
    });

    const removeButton = this.container.querySelector("#remove-shape");
    removeButton.addEventListener("click", () => {
      if (activeObject) {
        commands.removeObjectCommand({
          store: this.store,
          objectId: activeObject.id,
        });
      }
    });

    const toFrontButton = this.container.querySelector("#to-front");
    toFrontButton.addEventListener("click", () => {
      commands.moveToFrontCommand({
        store: this.store,
        objectId: activeObject.id,
      });
    });

    const toBackButton = this.container.querySelector("#to-back");
    toBackButton.addEventListener("click", () => {
      commands.moveToBackCommand({
        store: this.store,
        objectId: activeObject.id,
      });
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

class Tool {
  constructor(container, store) {
    this.store = store;
    this.container = container;
    this.selectedColor = "#000000";

    container.querySelectorAll(".tool-button").forEach((button) => {
      button.addEventListener("click", (event) => {
        this.store.setNewShapePlaceholder({
          type: event.target.dataset.shape,
          color: this.selectedColor,
        });
        this.setCursor("crosshair");
      });
    });

    container.querySelector("#color-picker").addEventListener("input", (event) => {
      this.selectedColor = event.target.value;
    });

    container.querySelector("#load-image").addEventListener("click", () => {
      container.querySelector("#image-loader").click();
    });

    container.querySelector("#image-loader").addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            this.store.setNewShapePlaceholder({
              type: "image",
              imageSrc: img.src,
            });
            this.setCursor("crosshair");
          };
          img.src = e.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }

  setCursor(cursorType) {
    // Not nice but ok for now
    document.getElementById("canvas").style.cursor = cursorType;
  }
}

export default Tool;

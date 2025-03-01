class LeftPanel {
  constructor(container, store) {
    this.store = store;
    this.container = container;
    this.store.subscribe(this.render.bind(this));

    document
      .getElementById("clean-canvas")
      .addEventListener("click", this.handleCleanCanvas.bind(this));
    document
      .getElementById("save-file")
      .addEventListener("click", this.handleSaveFile.bind(this));

    document.getElementById("open-file").addEventListener("click", () => {
      document.getElementById("json-loader").click();
    });
    document
      .getElementById("json-loader")
      .addEventListener("change", this.handleOpenFile.bind(this));

    this.render();
  }

  render() {
    this.container.innerHTML = "";
    const objects = this.store.getObjects();
    const selectedObject = this.store.getSelectedObject();
    objects.forEach((object) => {
      const listItem = document.createElement("li");
      const isSelected = selectedObject && object.id === selectedObject.id;
      listItem.className = isSelected ? "selected" : "";
      listItem.textContent = `${object.type}:${object.id}`;
      listItem.addEventListener("click", () => this.store.selectObject(object));
      this.container.appendChild(listItem);
    });
  }

  handleCleanCanvas() {
    const confirmation = confirm("Are you sure you want to clean the canvas?");
    if (confirmation) {
      this.store.clearObjects();
    }
  }

  handleOpenFile(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const objects = JSON.parse(e.target.result);
          this.store.replaceObjects(objects);
        } catch (error) {
          alert("Failed to parse JSON file.");
        }
      };
      reader.readAsText(file);
    }
  }

  handleSaveFile() {
    const objects = this.store
      .getObjects()
      .map(({ id, type, properties }) => ({ id, type, properties }));
    const json = JSON.stringify(objects, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "badge.json";
    a.click();
    URL.revokeObjectURL(url);
  }
}

export default LeftPanel;

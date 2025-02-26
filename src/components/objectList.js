class ObjectList {
  constructor(container, store) {
    this.store = store;
    this.container = container;
    this.store.subscribe(this.render.bind(this));
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
}

export default ObjectList;

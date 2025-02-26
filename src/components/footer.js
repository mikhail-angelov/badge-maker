class Footer {
  constructor(container, store) {
    this.store = store;
    this.container = container;
    this.store.subscribe(this.render.bind(this));
    this.render();
  }

  render() {
    this.container.innerHTML = "";
    const history = this.store.getHistory();
    const recentHistory = history.slice(-20);

    recentHistory.forEach((entry, index) => {
      const square = document.createElement("div");
      square.className = "history-square";
      square.title = `Action: ${entry.action}`;
      square.addEventListener("click", () => {
        console.log("restore", history.length - 2 + index);
        this.store.restoreFromHistory(history.length - 2 + index);
      });
      this.container.appendChild(square);
    });
  }
}

export default Footer;

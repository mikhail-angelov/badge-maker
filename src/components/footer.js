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
    const historyIndex = this.store.getHistoryIndex();
    const recentHistory = history.slice(-20);

    recentHistory.forEach((entry, index) => {
      const square = document.createElement("div");
      square.className = `history-square ${entry.action} ${
        index > historyIndex ? "forward" : ""
      }`;
      square.title = `Action: ${entry.action}`;
      square.addEventListener("click", () => {
        const effectiveIndex =
          history.length > 20 ? history.length - 20 + index : index;
        console.log("restore", effectiveIndex);
        this.store.restoreFromHistory(effectiveIndex);
      });
      this.container.appendChild(square);
    });
  }
}

export default Footer;

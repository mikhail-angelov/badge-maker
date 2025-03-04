const LIMIT_VISIBLE_HISTORY = 40;
class Footer {
  constructor(footer, store) {
    this.store = store;
    this.container = footer.querySelector('#history');
    this.store.subscribe(this.render.bind(this));
    this.render();
  }

  render() {
    this.container.innerHTML = "";
    const history = this.store.getHistory();
    const historyIndex = this.store.getHistoryIndex();
    const recentHistory = history.slice(-LIMIT_VISIBLE_HISTORY);

    recentHistory.forEach((entry, index) => {
      const square = document.createElement("div");
      square.className = `history-square ${entry.action} ${
        index > historyIndex ? "forward" : ""
      }`;
      square.title = `Action: ${entry.action}`;
      square.addEventListener("click", () => {
        const effectiveIndex =
          history.length > LIMIT_VISIBLE_HISTORY
            ? history.length - LIMIT_VISIBLE_HISTORY + index
            : index;
        this.store.restoreFromHistory(effectiveIndex);
      });
      this.container.appendChild(square);
    });
  }
}

export default Footer;

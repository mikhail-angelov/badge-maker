export class FontFamilyModal {
  constructor(container, font, text, onClose) {
    this.container = container;
    this.onClose = onClose;
    this.font = font;
    this.text = text;
    this.fonts = [
      "American Typewriter",
      "Andale Mono",
      "Arial",
      "Arial Black",
      "Arial Narrow",
      "Arial Rounded MT Bold",
      "Arial Unicode MS",
      "Avenir",
      "Avenir Next",
      "Avenir Next Condensed",
      "Baskerville",
      "Big Caslon",
      "Bodoni 72",
      "Bodoni 72 Oldstyle",
      "Bodoni 72 Smallcaps",
      "Bradley Hand",
      "Brush Script MT",
      "Chalkboard",
      "Chalkboard SE",
      "Chalkduster",
      "Charter",
      "Cochin",
      "Comic Sans MS",
      "Copperplate",
      "Courier",
      "Courier New",
      "Didot",
      "DIN Alternate",
      "DIN Condensed",
      "Futura",
      "Geneva",
      "Georgia",
      "Gill Sans",
      "Helvetica",
      "Helvetica Neue",
      "Herculanum",
      "Hoefler Text",
      "Impact",
      "Lucida Grande",
      "Luminari",
      "Marker Felt",
      "Menlo",
      "Microsoft Sans Serif",
      "Monaco",
      "Noteworthy",
      "Optima",
      "Palatino",
      "Papyrus",
      "Phosphate",
      "Rockwell",
      "Savoye LET",
      "SignPainter",
      "Skia",
      "Snell Roundhand",
      "Tahoma",
      "Times",
      "Times New Roman",
      "Trattatello",
      "Trebuchet MS",
      "Verdana",
      "Zapfino",
    ];

    this.render();

    this.container.querySelectorAll(".font-item").forEach((item) => {
      item.classList.toggle("selected", item.dataset.font === font);
    });
    this.container
      .querySelector("#all-fonts")
      .addEventListener("click", async () => {
        try {
          const allFonts = await queryLocalFonts();
          this.fonts = allFonts.map((font) => font.family);
          this.render();
        } catch (error) {
          console.error("error", error);
        }
      });
  }

  render() {
    this.container.innerHTML = `
      <div class="modal-overlay"></div>
      <div class="modal-content">
      <div class="row spread">
        <h2 class="title">Select Font</h2>
        <button id="all-fonts">Load All Fonts</button>
        </div>
        <div class="font-list">
          ${this.fonts
            .map(
              (font) => `
            <div class="font-item" data-font="${font}" style="font-family: ${font};">
              ${this.text} : ${font}
            </div>
          `
            )
            .join("")}
        </div>
        <button class="close-modal">Close</button>
      </div>
    `;

    this.container.querySelectorAll(".font-item").forEach((item) => {
      item.addEventListener("click", (event) => {
        const font = event.target.dataset.font;
        console.log("font", font);
        this.onClose(font);
      });
    });

    this.container
      .querySelector(".close-modal")
      .addEventListener("click", () => {
        this.onClose();
      });

    this.container
      .querySelector(".modal-overlay")
      .addEventListener("click", () => {
        this.onClose();
      });
  }

  open(selectedFont) {
    this.container.style.display = "block";
    this.container.querySelectorAll(".font-item").forEach((item) => {
      item.classList.toggle("selected", item.dataset.font === selectedFont);
    });
  }

  close() {
    this.container.style.display = "none";
  }
}

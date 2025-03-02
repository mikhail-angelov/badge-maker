# Badge Maker

Badge Maker is a web application that allows users to draw shapes and text on a canvas, manage the objects, and export the canvas as a PNG file. The application is built using pure JavaScript and IndexedDB for persistent storage.

[Live DEMO](https://mikhail-angelov.github.io/badge-maker/src/)

## Features

- Draw shapes (rectangle, circle) and text on a canvas
- Manage objects (add, remove, update properties)
- Export the canvas as a PNG file
- Persistent storage using IndexedDB
- Zoom in and out using mouse wheel
- Align and justify multiple selected objects
- Move objects to front or back
- Select font family for text objects

## Installation

1. Clone the repository:

    ```sh
    git clone https://github.com/yourusername/badge-maker.git
    ```

2. Navigate to the project directory:

    ```sh
    cd badge-maker
    ```

3. Open `index.html` in your web browser to start the application.

## Usage

- Click "Tool" buttons to add a new shape or text to the canvas.
- Click on an object in the object list to select it and view its properties.
- Update the properties of the selected object in the properties panel.
- Click the "Remove" button to remove the selected object.
- Use the mouse wheel to zoom in and out on the canvas.
- Click the "Export PNG" button to save the canvas as a PNG file.
- Use the alignment buttons to align or justify multiple selected objects.
- Use the "To Front" and "To Back" buttons to change the z-order of objects.
- Click the font family button to open a modal and select a font for text objects.

## Project Structure

```plaintext
badge-maker/
├── src/
│   ├── components/
│   │   ├── canvas.js
│   │   ├── fontFamilyModal.js
│   │   ├── objectList.js
│   │   ├── propertiesPanel.js
│   │   ├── tool.js
│   ├── store/
│   │   ├── IndexedDB.js
│   │   ├── shaper.js
│   │   ├── store.js
│   ├── index.html
│   ├── styles.css
│   ├── app.js
├── README.md
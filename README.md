# Badge Maker

Badge Maker is a web application that allows users to draw shapes and text on a canvas, manage the objects, and export the canvas as a PNG file. The application is built using pure JavaScript and IndexedDB for persistent storage.

[Live DEMO](https://mikhail-angelov.github.io/badge-maker/src/)

## Features

- Draw shapes (rectangle, circle) and text on a canvas
- Manage objects (add, remove, update properties)
- Export the canvas as a PNG file
- Persistent storage using IndexedDB
- Zoom in and out using mouse wheel

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

- Click the "Add" button to add a new shape or text to the canvas.
- Click on an object in the object list to select it and view its properties.
- Update the properties of the selected object in the properties panel.
- Click the "Remove" button to remove the selected object.
- Use the mouse wheel to zoom in and out on the canvas.
- Click the "Export PNG" button to save the canvas as a PNG file.

## Project Structure

```plaintext
badge-maker/
├── src/
│   ├── components/
│   │   ├── canvas.js
│   │   ├── objectList.js
│   │   ├── propertiesPanel.js
│   ├── store/
│   │   ├── indexedDBHelper.js
│   │   ├── shapes.js
│   │   ├── store.js
│   ├── index.html
│   ├── styles.css
│   ├── app.js
├── README.md
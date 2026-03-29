# Architecture Overview

## Summary

Badge Maker is a small browser-only application built with plain JavaScript, the DOM, the Canvas 2D API, and IndexedDB. There is no framework, build step, or server component. The application uses a single in-memory store as the source of truth for UI state and persists canvas objects to IndexedDB.

At runtime, the app is organized around three layers:

1. Composition and page shell
2. State and persistence
3. UI modules that render from store state and push user actions back into the store

## High-Level Structure

```text
src/index.html
  -> creates the page shell and DOM mount points

src/app.js
  -> wires the application together
  -> creates IndexedDB, Store, and UI components

src/store/
  indexedDB.js
    -> low-level persistence adapter around browser IndexedDB
  immutablePersistedCollection.js
    -> immutable-ish collection wrapper that synchronizes in-memory items with IndexedDB
  observable.js
    -> simple event emitter used by the store
  store.js
    -> main application state and command layer
  shaper.js
    -> shape factory, drawing helpers, hit testing, bounding boxes, and alignment logic

src/components/
  canvas.js
    -> interactive drawing surface and pointer/keyboard controller
  leftPanel.js
    -> object list and JSON import/export actions
  propertiesPanel.js
    -> selected object editor and group alignment controls
  tool.js
    -> shape/image creation tools
  footer.js
    -> history timeline / undo navigation
  fontFamilyModal.js
    -> font picker for text objects
```

## Application Lifecycle

`src/app.js` is the composition root.

- Creates `IndexedDB("BadgeMakerDB", "objects")`
- Creates `Store`, passing the database adapter
- Instantiates all UI modules with their DOM containers and the shared store
- Registers a few top-level browser events such as export and resize
- Triggers initial rendering

The store initializes persistence asynchronously on startup:

1. `Store` constructs `ImmutablePersistedCollection`
2. `Store.initDB()` loads saved objects from IndexedDB
3. The store writes the loaded state into history
4. The store emits `stateChange`
5. Components subscribed to `stateChange` re-render

This means the app can render once before persisted objects are loaded, then re-render when initialization completes.

## Core Architectural Pattern

The dominant pattern is a shared observable store.

- `Store` owns application state
- Components subscribe to `stateChange`
- Components read current state from the store during `render()`
- User actions call store methods such as `addShape`, `updateActiveObjectProps`, `removeObject`, or `alignSelectedObjects`
- Store mutations persist data, update history, and emit `stateChange`

This is not strict unidirectional state management, because some interactions temporarily mutate objects outside the store and commit them later. The main example is canvas drag/resize behavior, where `Canvas` mutates `activeObject.properties` during pointer movement and then persists the final result on mouse up.

## State Model

`src/store/store.js` keeps all application state in one object:

- `objects`: current persisted canvas objects
- `history`: snapshots used by the footer and undo flow
- `historyIndex`: current position in history
- `selectedObjectsIds`: multi-selection state
- `activeObject`: current focused object, sometimes augmented with drag offsets or temporary resize data
- `newShapePlaceholder`: transient shape draft while the user is dragging out a new item
- `copiedObjects`: copy/paste buffer, created lazily

### Important distinction

There are two categories of state:

- Persistent state
  - object `id`, `type`, and `properties`
  - stored in IndexedDB
- Ephemeral UI state
  - selection, active object offsets, placeholder shapes, current zoom
  - stored only in memory

This separation is useful: saved files and IndexedDB only contain drawable objects, not UI session details.

## Persistence Layer

Persistence is split into two modules.

### `indexedDB.js`

This is the lowest layer. It wraps raw IndexedDB operations:

- database initialization
- `put`
- `getAll`
- delete one object
- clear store

It only knows about storing plain objects.

### `immutablePersistedCollection.js`

This layer sits on top of `indexedDB.js` and provides collection-oriented operations:

- `init`
- `getAll`
- `add`
- `update`
- `updateMany`
- `remove`
- `clear`
- `replace`

Responsibilities:

- keeps an in-memory array of items
- freezes returned items to discourage accidental mutation
- rehydrates image objects by attaching a browser `Image` instance for `type === "image"`
- persists every collection mutation to IndexedDB

Despite the name, immutability is partial rather than absolute. The collection returns frozen persisted objects, but `Store.setActiveObject()` creates a cloned working copy that the canvas mutates during interaction before saving.

## Rendering and Interaction Flow

### Canvas

`src/components/canvas.js` is the most stateful UI module. It is both:

- a renderer for all shapes
- the controller for pointer, wheel, and keyboard interaction

Responsibilities:

- resize the `<canvas>` to match its container
- translate browser coordinates into canvas coordinates
- draw objects using helpers from `shaper.js`
- draw active selection outlines and marquee selection
- handle creation, dragging, resizing, zooming, keyboard movement, copy/paste, deletion, and undo shortcuts

Rendering is throttled with `requestAnimationFrame` through `scheduleRender()`, which prevents multiple store events from triggering immediate duplicate paints.

### Left panel

`src/components/leftPanel.js` renders the list of objects and owns file import/export actions.

- Reads objects from the store and displays them as a clickable list
- Selects or multi-selects items
- Clears the canvas
- Saves current objects as JSON
- Loads objects from a JSON file and replaces current state

### Properties panel

`src/components/propertiesPanel.js` renders either:

- a single-object property form, or
- a group alignment toolbar when multiple objects are selected

It uses `shaper.shapePropertiesMap` to generate the property editor dynamically by shape type. This is the main extension point for adding new editable shape properties.

### Tool panel

`src/components/tool.js` starts object creation workflows.

- Shape buttons create a `newShapePlaceholder`
- Color picker sets the default color for new non-image shapes
- Image upload reads a file as data URL and creates an image placeholder

The actual object is only committed after the user drags on the canvas and mouse up calls `store.addShape(...)`.

### Footer

`src/components/footer.js` visualizes history as colored squares and allows time-travel by restoring a specific snapshot.

## Shape System

`src/store/shaper.js` is the domain module for drawable objects.

It centralizes:

- supported shape types
- editable property metadata
- default shape creation
- canvas drawing logic
- outline drawing
- hit testing
- bounding box calculation
- resize behavior
- multi-object alignment rules

The file uses lookup maps keyed by shape type:

- `shapePropertiesMap`
- `renderMap`
- `renderOutlineMap`
- `shapeBoxMap`
- `updateShapeMap`

This makes shape support relatively easy to extend. To add a new shape type, the usual work is concentrated in `shaper.js`, followed by any UI affordances needed in the tool panel and property editor.

## Event Flow Examples

### Create rectangle

1. User clicks `Rect` in the tool panel
2. `Tool` stores a `newShapePlaceholder`
3. User drags on the canvas
4. `Canvas` updates placeholder dimensions during mouse move
5. On mouse up, `Canvas` calls `store.addShape("rectangle", placeholder)`
6. `Store` creates the shape through `shaper.createShape`
7. Collection persists it to IndexedDB
8. Store appends a history snapshot and emits `stateChange`
9. Panels and canvas re-render

### Move existing object

1. User presses on an existing shape
2. `Canvas` sets it as `activeObject` with drag offsets
3. During mouse move, `Canvas` mutates `activeObject.properties`
4. `Canvas` redraws locally for smooth feedback
5. On mouse up, `Canvas` calls `store.updateActiveObjectProps(...)`
6. Store persists the object, records history, and emits `stateChange`

### Undo / history restore

1. User presses `Cmd/Ctrl+Z` or clicks a history square
2. `Store.restoreFromHistory(index)` clones the saved snapshot
3. Collection replaces IndexedDB contents with that snapshot
4. Selection is cleared
5. Store emits `stateChange`

## File and Data Formats

### Persisted object shape

Objects are stored and exported as JSON with this structure:

```json
{
  "id": 1710000000000,
  "type": "rectangle",
  "properties": {
    "x": 240,
    "y": 240,
    "width": 100,
    "height": 100,
    "color": "blue"
  }
}
```

### Image objects

Images are persisted as `imageSrc` data URLs inside `properties`. On load, the collection creates an `Image` instance and attaches it to the runtime object so `CanvasRenderingContext2D.drawImage()` can use it.

## Coupling and Design Constraints

The codebase is intentionally simple, but several coupling points are worth knowing before changes:

- The store is shared directly across all components. There is no interface boundary between views and application state.
- `Canvas` combines rendering and interaction logic in one module, so changes to pointer behavior often affect paint behavior too.
- `shaper.js` is both model metadata and rendering engine. Adding a shape usually requires touching several maps in the same file.
- History stores whole snapshots, not patches. This is simple and reliable for a small app, but memory usage grows with object count and edit frequency.
- Some interactions rely on mutable working copies (`activeObject`, placeholder shapes), even though persisted items are frozen.
- The UI is built by imperative DOM creation and `innerHTML`, so component rendering is straightforward but not diff-based.

## Extension Guide

### Add a new shape type

Typical steps:

1. Add the shape definition to `shapePropertiesMap`
2. Implement drawing, outline, hit box, and resize behavior in `shaper.js`
3. Extend `createShape`
4. Add a tool button in `src/index.html`
5. Let `Tool` create the correct placeholder type
6. Verify the generated property form in `PropertiesPanel`

### Add a new persisted field

If the field belongs to drawable object data, it should live under `properties`. That keeps import/export, IndexedDB persistence, and rendering conventions consistent.

### Add a new UI panel or feature

Follow the existing pattern:

- subscribe to `store.on("stateChange", ...)`
- read current state through store getters
- perform mutations only through store methods when possible

## Current Risks and Refactor Targets

The current architecture is sufficient for a small single-user browser app, but these are the main pressure points if the project grows:

- `store.js` mixes persistence commands, selection state, history, clipboard, and editing logic in one class
- `canvas.js` is large enough to split into rendering, pointer interaction, and keyboard shortcuts
- `shaper.js` is doing several jobs and will become harder to maintain as shape count grows
- There is no automated test coverage around persistence, shape math, or history restoration
- Rendering, mutation, and persistence are loosely coordinated rather than enforced by a strict state transition model

For the current project size, this tradeoff is pragmatic: the code is easy to run, easy to inspect, and has very little framework overhead.

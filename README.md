# Badge Maker

Badge Maker is a local-first canvas editor for badge layouts with an AI planning mode. The editor runs in the browser, stores document state in IndexedDB, and can preview/apply Deepseek-generated badge scenarios through the same command layer used by the manual UI.

## Current Capabilities

- client-only badge editing in `index.html`
- AI mode in `ai.html`
- deterministic scenario validation and batch execution
- single-step undo for multi-action AI applies
- role-label based refinement prompts
- curved text fitting between circles
- separate SVG icon generation request for badge symbols
- strict SVG sanitization before image placement
- AI-generated shapes, text, and SVGs forced to black output

## Runtime Model

- one Node ESM server in [`server/`](./server)
- static UI served from [`src/`](./src)
- Deepseek used for scenario planning
- a separate Deepseek request used for symbolic SVG icon generation
- IndexedDB used for local persistence in the browser

## Requirements

Product requirements live in [`docs/prd.md`](./docs/prd.md).

Implementation status lives in [`docs/plan.md`](./docs/plan.md) and [`docs/plan2.md`](./docs/plan2.md).

## Setup

1. Install dependencies if your environment needs them.
2. Create a `.env` file with at least:

```env
DEEPSEEK_API_KEY=your_key_here
DEEPSEEK_MODEL=deepseek-chat
```

3. Start the server:

```sh
npm start
```

4. Open:

- `http://127.0.0.1:3000/index.html` for client-only mode
- `http://127.0.0.1:3000/ai.html` for AI mode

## Scripts

- `npm start` starts the server
- `npm run dev` starts the server in watch mode
- `npm test` runs the test suite

## AI Notes

- users always preview a plan before apply
- scenario execution stays local
- AI-generated text and shape colors are normalized to black
- generated SVG icons are requested separately, sanitized, and embedded as `data:image/svg+xml`
- SVG icon generation is free-form, not based on predefined icon enums

## Project Structure

```text
badge-maker/
├── docs/
├── server/
├── src/
│   ├── app.js
│   ├── app-ai.js
│   ├── components/
│   ├── core/
│   └── store/
├── tests/
└── README.md
```

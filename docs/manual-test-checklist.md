# Manual Test Checklist

## Client-Only Mode

- Open `http://127.0.0.1:3000/index.html` and verify the editor loads without console errors.
- Create a rectangle, circle, text object, and image object.
- Move, resize, recolor, and delete at least one object.
- Verify `Export PNG` produces a non-empty image.

## AI Plan Preview

- Open `http://127.0.0.1:3000/ai.html` and verify the AI panel renders.
- Generate a draft with the live `Deepseek` planner.
- Confirm the preview shows readable step summaries before apply.
- Confirm cancel clears the pending scenario without mutating the canvas.

## Follow-Up Edits

- Generate an initial badge with role-labeled objects.
- Prompt for a recolor edit against an existing label such as `center-circle`.
- Prompt for a text edit against `top-text`.
- Prompt for a reorder edit against `center-icon`.
- Prompt for a resize or align edit and verify the result matches the preview.

## Failure Handling

- Trigger a prompt that references a missing label and verify the app shows a warning instead of crashing.
- Apply a partially successful scenario and verify one undo returns to the pre-scenario canvas.
- Confirm the execution list shows which steps applied and which were skipped.

## Save And Load

- Save a canvas that includes role-labeled text, circle-text, and image objects.
- Reload the page and reopen the saved document.
- Verify role labels still appear in the left panel and AI state summary.

## Fonts And Fallbacks

- Create text using each allowed font and verify it renders in client-only mode.
- Run an AI scenario that requests a disallowed font and verify validation rejects it.
- Confirm curved text remains visible after follow-up edits that change font size.

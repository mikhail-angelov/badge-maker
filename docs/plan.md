# Implementation Plan: AI Badge Maker MVP

## Goal

Implement the MVP described in [`docs/prd.md`](/Users/ma/repo/badge-maker/docs/prd.md) while preserving the current client-only editor.

The plan assumes:

- one repository
- one shared editor core
- local-first document state
- backend-planned, frontend-executed AI scenarios
- explicit user confirmation before apply
- partial scenario execution with single-step batch undo

## Delivery Strategy

Build this in layers, not all at once.

Recommended order:

1. stabilize the existing editor and extract deterministic command boundaries
2. add scenario schema, validators, and batch execution
3. add text measurement and fitting primitives
4. add simple SVG icon generation and sanitization
5. add AI mode UI and plan preview/apply flow
6. add backend prompt endpoint
7. connect Deepseek planning to the frontend command layer
8. harden follow-up edits, role labels, and failure handling

This order matters because the AI feature depends more on editor discipline than on model integration.

## Proposed Repo Direction

The MVP can start with the current `src/` structure, but implementation should move toward this shape:

```text
docs/
  architecture.md
  prd.md
  plan.md
src/
  app.js
  app-ai.js
  core/
    commands/
    scenario/
    roles/
    fitting/
  components/
  store/
server/
  index.js
  routes/
  prompts/
```

This does not require an immediate full restructure. The important thing is to create clear seams.

## Phase 0: Pre-Work

Status: done

### Objective

Document the current baseline and remove known blockers that would make AI execution fragile.

### Tasks

- Fix unsafe mutation in group alignment.
- Confirm how history snapshots work and where batch snapshots should be added.
- Decide whether AI mode will be a separate HTML entrypoint, route, or feature-flagged panel.
- Add a minimal package script plan for frontend and backend development.

Current status:

- [x] Fix unsafe mutation in group alignment.
- [x] Confirm history snapshots and add batch history helpers in the shared command layer.
- [x] Decide whether AI mode will be a separate HTML entrypoint, route, or feature-flagged panel.
- [x] Add a minimal package script plan for frontend and backend development.

### Current code areas

- [`src/store/store.js`](/Users/ma/repo/badge-maker/src/store/store.js)
- [`src/store/shaper.js`](/Users/ma/repo/badge-maker/src/store/shaper.js)
- [`package.json`](/Users/ma/repo/badge-maker/package.json)

### Exit criteria

- Existing editor still works.
- Alignment no longer depends on mutating frozen persisted objects.
- Team agrees on AI mode entrypoint approach.

## Phase 1: Shared Command Layer

Status: in progress

### Objective

Create a deterministic command layer that both manual UI and AI scenario execution can use.

### Why first

Right now the store mixes UI state, persistence, history, clipboard, and mutation paths. AI execution needs a stable interface that does not depend on DOM event handlers or temporary object mutations.

### Tasks

- Introduce `src/core/commands/` for explicit editor commands.
- Wrap or extract store operations into command functions with clear inputs and outputs.
- Add a batch execution helper for scenario application.
- Add snapshot helpers for pre-batch and post-batch history recording.
- Separate transient UI-only state from persistent object mutations wherever practical.

Current status:

- [x] Introduce `src/core/commands/` for explicit editor commands.
- [x] Wrap key store operations into command functions with structured success/failure results.
- [x] Add a batch execution helper for scenario application.
- [x] Add snapshot helpers for batch history recording.
- [~] Route manual UI paths through command wrappers where practical.
- [~] Separate transient UI-only state from persistent object mutations wherever practical.

### Recommended initial commands

- `createShapeCommand`
- `updateObjectCommand`
- `removeObjectCommand`
- `alignObjectsCommand`
- `moveToFrontCommand`
- `moveToBackCommand`
- `replaceCanvasCommand`
- `selectObjectsCommand`
- `clearSelectionCommand`
- `executeScenarioBatch`

### Likely files

- new: `src/core/commands/index.js`
- new: `src/core/commands/executeScenarioBatch.js`
- new: `src/core/commands/historyBatch.js`
- update: [`src/store/store.js`](/Users/ma/repo/badge-maker/src/store/store.js)
- update: [`src/components/canvas.js`](/Users/ma/repo/badge-maker/src/components/canvas.js)
- update: [`src/components/propertiesPanel.js`](/Users/ma/repo/badge-maker/src/components/propertiesPanel.js)

### Design notes

- Commands should operate on canonical object IDs internally.
- Commands should return structured success/failure results, not only mutate silently.
- AI execution should never call random store methods directly once this layer exists.

### Exit criteria

- Manual features use the new commands or compatible wrappers.
- Batch execution can apply multiple commands and produce a single undo entry.

## Phase 2: Scenario Schema and Validation

Status: done

### Objective

Define the structured contract between backend planner and frontend executor.

### Tasks

- Add scenario schema definition under `src/core/scenario/`.
- Add runtime validation for:
  - `schemaVersion`
  - action type
  - shape type
  - field presence
  - numeric bounds
  - role-label references
  - allowed fonts
- Add plan-summary formatter for human-readable preview before apply.
- Add structured failure result format for per-step warnings.

Current status:

- [x] Add scenario schema definition under `src/core/scenario/`.
- [x] Add runtime validation for schema version, actions, shapes, numeric bounds, allowed fonts, and role-label references.
- [x] Add a plan-summary formatter for human-readable preview before apply.
- [x] Add structured failure results for per-step warnings and skipped actions.

### Likely files

- new: `src/core/scenario/schema.js`
- new: `src/core/scenario/validateScenario.js`
- new: `src/core/scenario/validateAction.js`
- new: `src/core/scenario/formatScenarioSummary.js`

### Decision

Use handwritten validation first. A schema library can be added later if the project grows.

### Exit criteria

- Frontend can parse and validate a local sample scenario without any backend.
- Invalid scenarios are rejected before execution.

## Phase 3: Role Labels and State Summaries

Status: done

### Objective

Support stable AI targeting for follow-up edits.

### Tasks

- Extend object shape to include canonical `roleLabel`.
- Add role-label normalization and deduplication rules.
- Add helper to resolve `roleLabel -> objectId`.
- Add helper to generate compact state summaries for the backend.
- Ensure JSON save/load behavior is defined for `roleLabel`.

Current status:

- [x] Extend object shape to include canonical `roleLabel`.
- [x] Add role-label normalization and deduplication rules.
- [x] Add helper to resolve `roleLabel -> objectId`.
- [x] Add helper to generate compact state summaries for the backend.
- [x] Ensure JSON save/load behavior is defined for `roleLabel`.

### Recommended normalization rules

- lowercase only
- replace spaces with `-`
- remove unsupported characters
- deduplicate with suffixes such as `-2`, `-3`

### Likely files

- new: `src/core/roles/normalizeRoleLabel.js`
- new: `src/core/roles/resolveRoleLabel.js`
- new: `src/core/roles/buildStateSummary.js`
- update: [`src/store/shaper.js`](/Users/ma/repo/badge-maker/src/store/shaper.js)
- update: [`src/store/immutablePersistedCollection.js`](/Users/ma/repo/badge-maker/src/store/immutablePersistedCollection.js)
- update: [`src/components/leftPanel.js`](/Users/ma/repo/badge-maker/src/components/leftPanel.js)

### Important choice

Follow the PRD recommendation:

- model proposes labels
- frontend canonicalizes and stores them
- backend only sees canonical labels from the current summary

### Exit criteria

- Newly created objects can store role labels.
- Follow-up scenarios can target existing objects by canonical label.

## Phase 4: Text Measurement and Circle-Text Fitting

Status: done

### Objective

Add deterministic geometry helpers for self-adjusting layout.

### Tasks

- Extract text measurement helpers from current rendering logic where needed.
- Implement `measureTextBox`.
- Implement `measureCircleText`.
- Implement `detectCircleTextCollision`.
- Implement `fitCircleTextBetweenRadii`.
- Restrict fitting to MVP-safe fonts.
- Decide where fitting runs in MVP.

Current status:

- [x] Extract measurement and fitting helpers under `src/core/fitting/`.
- [x] Sanitize and normalize circle-text geometry before create/update.
- [x] Reject infeasible circle-text geometry before execution.
- [x] Verify live Deepseek planning renders visible curved text in the browser.

### Recommended execution location

Run fitting in the frontend/browser first.

Reason:

- current text measurement depends on browser rendering
- current app already uses DOM/canvas measurement primitives
- browser-side fitting reduces font-environment mismatch

Backend may still plan at a higher level, but browser should be the authority for final fit values in MVP if exact measurement matters.

### Likely files

- new: `src/core/fitting/measureTextBox.js`
- new: `src/core/fitting/measureCircleText.js`
- new: `src/core/fitting/detectCircleTextCollision.js`
- new: `src/core/fitting/fitCircleTextBetweenRadii.js`
- update: [`src/store/shaper.js`](/Users/ma/repo/badge-maker/src/store/shaper.js)

### Exit criteria

- A local test harness or demo can compute a circle-text fit between two radii.
- The fitting layer can return `fit`, `tight_fit`, or `cannot_fit` style statuses.

## Phase 4.5: SVG Icon Generation

Status: done

### Objective

Allow the LLM to request simple SVG icons through a separate free-form SVG generation call that can be safely placed on badges without external asset lookup.

### Tasks

- Add a free-form SVG-request path for symbolic badge icons.
- Add a separate Deepseek SVG-generation request distinct from the main scenario request.
- Sanitize generated SVG before converting it into a drawable image source.
- Add scenario/application support for placing generated SVG icons on the canvas.
- Add tests that reject unsafe or malformed SVG.

Current status:

- [x] Add a separate free-form Deepseek SVG request path for symbolic badge icons.
- [x] Sanitize generated SVG and convert it to safe `data:image/svg+xml` sources.
- [x] Support free-form SVG requests and sanitized SVG markup on image shapes through scenario validation and command execution.
- [x] Add unit coverage for SVG request validation, unsafe markup rejection, and command materialization.
- [x] Verify a live Deepseek plan can preview/apply an SVG icon image object in the browser.

### Likely files

- new: `src/core/icons/sanitizeSvgIcon.js`
- update: `src/core/commands/index.js`
- update: `src/core/scenario/schema.js`
- update: `src/components/aiPanel.js`
- update: `server/prompts/systemPrompt.js`
- update: `server/prompts/formatGenerateRequest.js`
- new: `server/prompts/systemSvgPrompt.js`
- new: `server/prompts/formatGenerateSvgRequest.js`
- new: `server/routes/generateSvg.js`

### Exit criteria

- The planner can request a symbolic badge icon without external asset lookup.
- Unsafe SVG is rejected before canvas rendering.
- A generated SVG icon can be placed on the badge as an image object through a separate SVG-generation request.

## Phase 5: AI Mode Frontend

Status: done

### Objective

Add the user-facing AI workflow for previewing and applying backend-planned scenarios.

### Tasks

- Add AI mode entrypoint or panel.
- Add prompt input UI.
- Add loading, error, and warning states.
- Add plan summary preview.
- Add confirm/apply and cancel controls.
- Add result reporting for partial failures.
- Add the Deepseek-backed preview flow to the UI.

Current status:

- [x] Add AI mode entrypoint or panel.
- [x] Add prompt input UI.
- [x] Add loading, error, and warning states.
- [x] Add plan summary preview.
- [x] Add confirm/apply and cancel controls.
- [x] Add result reporting for partial failures.
- [x] Add the Deepseek-backed preview flow to the UI.

### Recommended approach

Start with a separate entrypoint such as `src/app-ai.js` if that is the cleanest way to keep the client-only app untouched.

### Likely files

- new: `src/app-ai.js`
- new: `src/components/aiPanel.js`
- update: [`src/index.html`](/Users/ma/repo/badge-maker/src/index.html)
- update: [`src/styles.css`](/Users/ma/repo/badge-maker/src/styles.css)

### Exit criteria

- User can open AI mode.
- User can preview a backend-generated scenario and apply it through the shared batch executor.

## Phase 6: Backend Planning Endpoint

Status: done

### Objective

Add the minimal backend needed to call the model and return structured scenarios.

### Tasks

- Create `server/`.
- Add one HTTP endpoint: `POST /api/generate`.
- Add prompt formatter with:
  - system instructions
  - schema instructions
  - role-label rules
  - font restrictions
  - tool-usage rules for fitting-sensitive requests
- Add response parser and error handling.
- Add local config handling for API keys.

Current status:

- [x] Create `server/`.
- [x] Add one HTTP endpoint: `POST /api/generate`.
- [x] Add prompt formatter with schema, role-label, and font constraints.
- [x] Add response parsing and error handling.
- [x] Add local config handling for API keys from `.env`.
- [x] Keep Deepseek execution behind config and runtime availability.

### Recommended MVP backend shape

- plain Node HTTP server or small Express server
- no Socket.IO
- no persistent document state
- no auth in MVP

### Likely files

- new: `server/index.js`
- new: `server/routes/generate.js`
- new: `server/prompts/systemPrompt.js`
- new: `server/prompts/formatGenerateRequest.js`
- new: `server/lib/parseScenarioResponse.js`

### Exit criteria

- Frontend can send a prompt and receive a versioned scenario.
- Backend returns clean errors on timeout, invalid model output, and unavailable service.

## Phase 7: Frontend/Backend Integration

Status: done

### Objective

Connect the AI UI to the backend and the local execution engine.

### Tasks

- Add API client in frontend.
- Send compact state summaries with prompts.
- Validate returned scenarios.
- Present plan preview before apply.
- Execute confirmed scenarios locally through `executeScenarioBatch`.
- Show per-step warnings after partial execution.

Current status:

- [x] Add API client in frontend.
- [x] Send compact state summaries with prompts.
- [x] Validate returned scenarios.
- [x] Present plan preview before apply.
- [x] Execute confirmed scenarios locally through `executeScenarioBatch`.
- [x] Show per-step warnings after partial execution.
- [x] Add full backend-mode verification against a live model.

### Likely files

- new: `src/core/api/generateScenario.js`
- update: `src/components/aiPanel.js`
- update: `src/core/scenario/validateScenario.js`
- update: `src/core/commands/executeScenarioBatch.js`

### Exit criteria

- End-to-end prompt -> plan -> confirm -> apply flow works locally.
- Failed actions are reported and one-step undo restores pre-scenario state.

## Phase 8: Follow-Up Edits

Status: done

### Objective

Support refinement prompts against an existing canvas.

### Tasks

- Include role labels and fitting-relevant geometry in state summary.
- Resolve scenario target references by canonical role label.
- Add prompt examples for refinement flows.
- Harden ambiguous-target handling.

Current status:

- [x] Include role labels, derived geometry, stack order, and source hints in the state summary.
- [x] Resolve scenario target references by canonical role label.
- [x] Add refinement examples and role-label guidance to the Deepseek prompt formatter.
- [x] Harden unresolved-label handling so failed targets become warnings without corrupting applied steps.
- [x] Expand live refinement verification to cover align and resize edits in addition to recolor, reorder, and text edits.

### Required behaviors

- unresolved labels do not crash the scenario
- unresolved labels produce warnings
- user can still undo the whole batch

### Exit criteria

- User can create a draft and then refine it with at least:
  - recolor
  - resize
  - align
  - reorder
  - edit text

## Phase 9: Verification and Hardening

Status: in progress

### Objective

Reduce regression risk and improve reliability.

### Tasks

- Add lightweight automated coverage for:
  - scenario validation
  - role-label normalization
  - batch execution behavior
  - single-step undo after partial execution
  - circle-text fitting edge cases
- Add manual test checklist for:
  - client-only mode still works
  - AI mode plan preview
  - failed-step warnings
  - save/load with role labels
  - font fallback behavior

Current status:

- [x] Add lightweight automated coverage for scenario validation, role-label targeting, batch execution behavior, unresolved-label warnings, SVG icon safety, and circle-text fitting edge cases.
- [x] Add store-level undo/regression coverage beyond the lightweight command-store tests.
- [x] Add a manual browser checklist for client-only mode, AI plan preview, failed-step warnings, save/load, and font fallback behavior.
- [~] Run the full manual checklist end-to-end in the browser.
  Completed so far: client-only smoke path, export PNG, explicit JSON open, reload persistence with role labels, Deepseek refinement flows, align/resize verification, browser-level failed-step warning flow, circle-text ring fitting against concentric circles, centered inner-label placement, and color-input console cleanup.
  Remaining gap: font fallback is only partially verified through the manual font picker plus automated AI validation tests.

### Recommended test priorities

1. validation and execution correctness
2. history batch behavior
3. fitting math
4. follow-up targeting

## Concrete File-Level Change List

### Existing files likely to change

- [`package.json`](/Users/ma/repo/badge-maker/package.json)
- [`src/app.js`](/Users/ma/repo/badge-maker/src/app.js)
- [`src/index.html`](/Users/ma/repo/badge-maker/src/index.html)
- [`src/styles.css`](/Users/ma/repo/badge-maker/src/styles.css)
- [`src/store/store.js`](/Users/ma/repo/badge-maker/src/store/store.js)
- [`src/store/shaper.js`](/Users/ma/repo/badge-maker/src/store/shaper.js)
- [`src/store/immutablePersistedCollection.js`](/Users/ma/repo/badge-maker/src/store/immutablePersistedCollection.js)
- [`src/components/canvas.js`](/Users/ma/repo/badge-maker/src/components/canvas.js)
- [`src/components/propertiesPanel.js`](/Users/ma/repo/badge-maker/src/components/propertiesPanel.js)
- [`src/components/leftPanel.js`](/Users/ma/repo/badge-maker/src/components/leftPanel.js)

### New files likely to be added

- `src/app-ai.js`
- `src/components/aiPanel.js`
- `src/core/commands/index.js`
- `src/core/commands/executeScenarioBatch.js`
- `src/core/commands/historyBatch.js`
- `src/core/scenario/schema.js`
- `src/core/scenario/validateScenario.js`
- `src/core/scenario/formatScenarioSummary.js`
- `src/core/roles/normalizeRoleLabel.js`
- `src/core/roles/resolveRoleLabel.js`
- `src/core/roles/buildStateSummary.js`
- `src/core/fitting/measureTextBox.js`
- `src/core/fitting/measureCircleText.js`
- `src/core/fitting/detectCircleTextCollision.js`
- `src/core/fitting/fitCircleTextBetweenRadii.js`
- `src/core/api/generateScenario.js`
- `server/index.js`
- `server/routes/generate.js`
- `server/prompts/systemPrompt.js`
- `server/prompts/formatGenerateRequest.js`
- `server/lib/parseScenarioResponse.js`

## Dependencies Between Phases

- Phase 1 is required before reliable AI execution.
- Phase 2 depends on Phase 1.
- Phase 3 depends on Phase 2 for target validation.
- Phase 4 can start in parallel with late Phase 2 if isolated cleanly.
- Phase 5 can land with UI scaffolding first, but final verification depends on the backend planner.
- Phase 6 can be built in parallel with late Phase 5.
- Phase 7 depends on Phases 2, 5, and 6.
- Phase 8 depends on Phases 3 and 7.
- Phase 9 runs continuously but should intensify before release.

## Risks and Mitigations

### Risk: command layer refactor destabilizes current editor

Mitigation:

- keep store wrappers initially
- migrate call sites incrementally
- test client-only mode after each command extraction

### Risk: fitting logic differs across environments

Mitigation:

- make browser the source of truth for exact fitting in MVP
- keep font allowlist small
- avoid backend-side exact text metrics initially

### Risk: role-label ambiguity breaks follow-up edits

Mitigation:

- canonicalize labels in frontend
- require uniqueness
- show clear warnings for unresolved labels

### Risk: history model cannot support batch undo cleanly

Mitigation:

- add explicit pre/post batch snapshot helpers early
- do not rely on current per-action push semantics for AI scenarios

## Recommended First Milestone

The first milestone should not call the model yet.

Deliver this first:

1. fix alignment mutation issue
2. extract command layer
3. add scenario schema and validator
4. add batch executor with one-step undo
5. add AI panel that can preview a validated scenario and apply it locally

If that milestone feels solid, then backend integration becomes much lower risk.

## Definition of Done for MVP

- client-only mode still works without backend
- AI mode can request a scenario from the backend
- user always reviews and confirms before apply
- scenario validation rejects invalid plans safely
- confirmed scenarios execute locally through shared commands
- partial failures produce warnings without corrupting state
- one undo restores the pre-scenario canvas
- follow-up prompts can target existing objects by canonical role label
- circle-text fitting uses deterministic helpers, not model-only guesses

## Recommendation

Do not start by wiring an LLM into the current store directly. Start by making the editor executable through a strict local command layer. That is the real foundation of the AI feature. Once that exists, the backend is mostly a planner that speaks a validated scenario format.

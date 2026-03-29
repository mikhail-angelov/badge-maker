# PRD: AI Badge Maker MVP

## Overview

This document defines the MVP for adding an AI-assisted version of Badge Maker while keeping the existing client-only editor intact.

The product will support two modes in the same repository:

- client-only mode: the current browser app, with no backend dependency
- AI mode: the same editor core plus an AI assistant that translates a user prompt into a structured badge-building scenario

The MVP goal is not a fully autonomous design agent. The goal is a constrained prompt-to-badge assistant that can generate and edit badge compositions using the app's existing object model.

## Why This Feature

Badge Maker already has the main ingredients needed for an AI-assisted workflow:

- a small and understandable shape vocabulary
- deterministic canvas rendering
- store methods for creating, updating, removing, aligning, and reordering objects
- JSON import/export and local persistence

That makes the app a reasonable candidate for a tool-using assistant. The AI can operate at the level of editor commands instead of trying to generate pixels directly.

The expected value of the feature is:

- help non-designers create a usable badge draft quickly
- reduce manual repetitive layout work
- make the app easier to demo and easier to understand
- enable iterative prompt-based refinement such as "make the center text larger" or "align the star and text"
- allow simple symbolic badge icons to be generated on demand without external asset lookup

## Product Goal

Allow a user to enter a natural-language prompt such as:

`Create a gold sheriff-style badge with curved top text saying POLICE, a blue circle in the center, and white text with a bold look.`

The system should translate that request into a sequence of safe editor actions and apply them to the existing canvas.

## Success Criteria

The MVP is successful if a user can:

1. open the AI mode of the app
2. enter a prompt describing a badge
3. see a structured plan or preview of what the assistant intends to do
4. confirm and apply the plan to the canvas
5. continue editing the result manually with the existing editor tools
6. ask for a follow-up adjustment and have it applied without corrupting state

## Non-Goals

The MVP should not attempt to solve the following:

- autonomous end-to-end graphic design
- arbitrary natural-language control over every possible visual detail
- multi-user collaboration
- real-time co-editing
- arbitrary tool execution by the model
- server-side rendering parity with browser canvas
- production-grade auth, billing, quotas, or user accounts
- image generation
- fully automatic "best design" decisions with no user review

## User Personas

### Primary user

A non-designer or casual maker who wants to create a badge-like composition quickly and is comfortable refining the output manually after generation.

### Secondary user

A developer, designer, or internal tester evaluating whether prompt-driven scene generation is valuable enough to justify deeper investment.

## User Stories

- As a user, I want to describe a badge in plain English and get a first draft on the canvas.
- As a user, I want to review what the assistant plans to do before it edits my canvas.
- As a user, I want AI-generated changes to be undoable.
- As a user, I want to continue manual editing after AI generation without switching tools or formats.
- As a user, I want to ask for small changes like repositioning, recoloring, resizing, or alignment.
- As a user, I want the assistant to generate simple SVG badge icons such as a shield with `P` for police or a skull and crossbones for a pirate badge.
- As a user, I want the app to remain usable in a client-only mode with no backend.

## Product Principles

- Reuse the existing editor core rather than forking logic.
- Keep the AI layer narrow and tool-driven.
- Make changes inspectable and reversible.
- Prefer predictable structured actions over free-form agent autonomy.
- Start with a single-user request/response workflow.
- Avoid backend complexity until the product value is proven.

## Proposed Repo Strategy

The MVP stays in the same repository.

Reasoning:

- both modes should share the same object model and shape logic
- both modes should render through the same canvas code
- both modes should use the same import/export format
- splitting repos now would create drift and duplicate maintenance

Suggested structure direction:

```text
docs/
src/                     # existing client-only editor and new future AI-enabled frontend entrypoint
server/                  # optional backend for LLM calls
src/core/                # shared command and schema layer
```

The MVP does not require this full restructuring immediately, but code changes should move in that direction.

## MVP Scope

### In scope

- keep the current client-only app working
- add an AI-enabled mode in the same repo
- add a backend endpoint that accepts user prompts
- convert prompts into a structured scenario using an LLM
- validate the scenario before applying it
- execute the scenario locally in the browser through shared editor commands
- support a limited action set
- support simple model-generated SVG icons that can be placed on the badge as image objects
- allow iterative prompt-based follow-up edits
- preserve undo/history behavior
- show AI status and results clearly in the UI
- require user confirmation before applying any AI-generated scenario
- handle partial scenario failures gracefully with per-step warnings

### Out of scope

- collaboration between users
- persistent cloud projects
- advanced design templates marketplace
- server-driven canvas state
- arbitrary image asset retrieval from the internet
- unrestricted font discovery on the backend
- full conversational memory across sessions

## MVP Experience

### Mode selection

The app should support two runtime modes:

- client-only mode
- AI mode

This can be done with separate entrypoints, routes, or a feature flag. The important part is that the editor core remains shared.

### AI flow

1. User opens AI mode.
2. User types a prompt in an AI panel.
3. Frontend sends the prompt and current editor state summary to the backend.
4. Backend calls the model and asks it to return a structured scenario.
5. Frontend receives the scenario.
6. Frontend validates the scenario against an allowed schema.
7. Frontend shows a human-readable summary of the proposed actions.
8. **User reviews and confirms apply. Scenarios never apply without explicit confirmation.**
9. Frontend snapshots the current canvas state before starting scenario execution.
10. Frontend executes each action in sequence against the local editor command layer.
11. If an action fails, completed actions are kept, the failed action is skipped, and the user is shown a warning identifying which step failed and why.
12. After execution completes, the frontend records the batch as one logical history entry using the pre-scenario snapshot and the final resulting state.
13. User may continue with manual edits or another prompt.

### Follow-up edit flow

1. User has an existing canvas.
2. User enters a refinement prompt such as `center the text and make the main circle darker`.
3. Frontend sends the prompt along with a state summary that includes semantic role labels for each object (e.g. `outer-ring-text`, `center-circle`).
4. The model uses role labels to identify target objects. It does not receive or emit raw object IDs.
5. Backend returns structured update actions referencing objects by their inferred role labels.
6. Frontend resolves role labels to current object IDs before executing.
7. Frontend validates and applies the actions with the same confirm-then-execute flow as the initial prompt.

## Functional Requirements

### Shared editor command layer

The app needs a command layer that both manual UI and AI execution can use.

Candidate commands:

- `createShape`
- `updateObject`
- `removeObject`
- `alignObjects`
- `moveToFront`
- `moveToBack`
- `replaceCanvas` *(restricted — requires a separate explicit confirmation dialog; not eligible for silent AI execution)*
- `selectObjects`
- `clearSelection`

These commands should be deterministic and should not require the model to know internal store details.

### Object identity and role labeling

The AI refers to objects using semantic role labels, not internal IDs. Because object targeting is a critical requirement for follow-up edits, the system needs one clear source of truth for role labels.

#### Available options

- Option A: frontend-generated labels
- Behavior: the frontend creates deterministic labels such as `circle-1` or `title-text-1` and the model may only reference labels provided in the summary
- Pros: simplest validation, strongest determinism
- Cons: labels are less semantic and less natural for follow-up prompts

- Option B: model-proposed labels, frontend-canonicalized labels
- Behavior: the model proposes semantic labels such as `outer-ring` or `center-circle`, and the frontend validates, normalizes, deduplicates, and stores the final canonical label
- Pros: preserves semantic meaning while keeping frontend control
- Cons: requires canonicalization and conflict handling

- Option C: model-owned labels
- Behavior: the model creates and maintains labels with no frontend authority beyond storage
- Pros: simplest for prompt design
- Cons: weakest reliability, highest ambiguity, poor fit for deterministic execution

**Recommended MVP choice:** Option B.

Under the recommended approach, the model may propose a `roleLabel` for newly created objects, but the frontend is the final authority for accepting and persisting the canonical label. Follow-up prompts may reference only canonical labels present in the latest state summary.

#### Role label assignment

- For create actions, the model may propose a role label such as `outer-ring`, `center-circle`, or `badge-title-text`.
- The frontend validates the proposed label, normalizes it if needed, resolves conflicts, and stores the canonical label alongside the object in canvas state.
- The state summary sent to the backend includes the canonical role label for each existing object.
- In follow-up prompts, the model refers only to labels present in the latest summary.

#### Role label resolution

- Before executing any action that targets an existing object, the frontend resolves the role label to the current internal ID.
- If a role label cannot be resolved, that action is skipped and a warning is shown to the user.
- Role labels must be unique within a canvas. If a conflict arises, the frontend should warn and prompt the user to clarify.

#### Constraints

- The model should not emit internal object IDs in action payloads.
- The model should not assume that role label names are permanent if the user has manually deleted or replaced an object.

### Partial failure handling

AI scenarios consist of multiple sequential actions. Execution does not require all-or-nothing atomicity.

The defined behavior for action failures is:

- apply all actions that succeed
- skip any action that fails validation or execution
- after all actions have been attempted, show the user a summary of which actions were applied and which were skipped, with a reason for each skipped step
- the canvas is left in the state produced by the completed actions; it is not rolled back
- the user can undo the entire batch using the standard undo control, which treats the confirmed scenario as a single history entry built from one pre-scenario snapshot and one final post-execution state

This means the applied portion of a scenario is always undoable in one step, even when some actions were skipped.

#### Available options

- Option A: atomic scenario execution
- Behavior: if any action fails, roll back the entire scenario
- Pros: strongest consistency, simplest user mental model
- Cons: discards useful successful work and makes the assistant less forgiving

- Option B: partial execution with single-step batch undo
- Behavior: successful actions remain applied, failed actions are skipped, but the whole scenario is undoable in one step
- Pros: good UX, preserves useful work, aligns with the intended AI workflow
- Cons: requires explicit batch snapshot handling

- Option C: partial execution with per-action undo history
- Behavior: each action becomes its own history entry
- Pros: easiest to implement naively
- Cons: noisy history and weak AI interaction model

**Recommended MVP choice:** Option B.

### Self-adjusting layout requirement

The MVP should not rely on the model alone for precise visual fitting tasks.

Examples:

- `add centered curved text which fills the space between two circles`
- `make the top ring text larger until it fits without collisions`
- `use the best spacing so the text feels balanced across the arc`

These requests require deterministic geometry and measurement, not only prompt interpretation.

The correct split of responsibility is:

- the model interprets user intent
- deterministic tools compute final geometry
- the frontend applies validated results

For the MVP, self-adjustment should be supported at least for circle text fitting.

### Recommended MCP-style tool layer

The AI mode should expose a narrow tool surface, similar to an MCP tool contract, instead of asking the model to invent numeric layout values unaided.

Recommended tool categories:

- editor command tools
- layout fitting tools
- measurement tools
- font metadata tools

#### Editor command tools

These are the safe state-changing operations:

- `createShape`
- `updateObject`
- `removeObject`
- `alignObjects`
- `moveToFront`
- `moveToBack`
- `replaceCanvas`

#### SVG icon tool

The MVP may include one narrow SVG-generation capability as a separate LLM request:

- `generateBadgeSvgIcon`

Purpose:

- generate small symbolic SVGs for badge use without internet asset lookup
- accept free-form icon requests such as:
  - shield with `P`
  - sheriff or police emblem
  - skull and crossbones
  - anchor
  - laurel
- run as a separate model request from the main scenario-planning request

Constraints:

- output must be plain SVG markup only
- no scripts, foreign objects, remote URLs, embedded HTML, or external references
- output must use a bounded `viewBox`
- the returned SVG must be sanitized before converting it into an image object
- this is for simple iconography, not arbitrary illustration generation

#### Layout fitting tools

These tools translate semantic intent into computed values.

Recommended MVP tool:

- `fitCircleTextBetweenRadii`

Suggested input:

```json
{
  "text": "POLICE",
  "fontFamily": "Arial",
  "innerRadius": 90,
  "outerRadius": 120,
  "startAngle": -110,
  "endAngle": 110,
  "padding": 4,
  "preferCentered": true,
  "preferInside": true
}
```

Suggested output:

```json
{
  "status": "fit",
  "radius": 105,
  "fontSize": 18,
  "kerning": 1.2,
  "startAngle": -97,
  "textInside": true,
  "inwardFacing": true,
  "occupiedAngle": 194,
  "warnings": []
}
```

Responsibilities of this tool:

- choose a drawable radius between the provided bounds
- maximize font size within the available band
- tune kerning to reduce visible gaps
- keep text centered within the requested angular span
- avoid collisions with the inner and outer circle boundaries
- report when the request cannot fit cleanly

#### Measurement tools

These tools should support fitting and validation without mutating canvas state.

Recommended MVP tools:

- `measureCircleText`
- `measureTextBox`
- `detectCircleTextCollision`

Typical uses:

- estimate occupied arc length
- estimate text height in a chosen font
- verify whether a proposed fit intersects another shape or boundary

#### Font metadata tools

The MVP defines a fixed set of MVP-safe fonts (see Font Safety section). Detailed font metrics are kept internal to the fitting layer.

The following tools are deferred to post-MVP:

- `listAvailableFonts`
- `getFontMetrics`
- `rankFontsForArcText`

### Font safety

The MVP defines a small set of fonts that are treated as safe for the supported browser runtime. This should be understood as a browser-runtime guarantee, not a universal guarantee across backend hosts, CI machines, or every operating system.

#### Available options

- Option A: browser-safe fixed list
- Behavior: allow only a small font allowlist expected in the browser environments the product targets
- Pros: simple and predictable
- Cons: still depends on runtime assumptions

- Option B: bundled web fonts
- Behavior: ship supported fonts with the app and load them explicitly
- Pros: strongest rendering consistency
- Cons: more setup, larger assets, and possible licensing questions

- Option C: dynamic device font discovery
- Behavior: inspect available fonts on each device and adapt the planner
- Pros: flexible
- Cons: too variable and too complex for MVP

**Recommended MVP choice:** Option A initially, with a path to Option B if fitting consistency becomes a problem.

**MVP-safe fonts:**

- `Arial`
- `Courier New`

The model must not recommend or emit any other font family in action payloads. If a user prompt requests a font outside this set, the model should substitute the closest MVP-safe font and note the substitution in the plan summary.

This list may be extended in a later phase once font availability and rendering consistency have been validated more broadly.

### AI prompt input

AI mode must include:

- prompt text input
- submit button
- loading state
- result summary panel showing the proposed action plan in human-readable form
- confirm/apply button (required before any change is made to the canvas)
- cancel button
- warning display for skipped actions after partial execution
- error state for complete failures

### Scenario schema

The model must return structured JSON, not prose as executable instructions.

The schema must include a `schemaVersion` field. The frontend must reject any scenario whose `schemaVersion` does not match the version it knows how to execute.

Example high-level scenario shape:

```json
{
  "schemaVersion": "1",
  "goal": "Create a police badge layout",
  "actions": [
    {
      "type": "createShape",
      "roleLabel": "center-circle",
      "shape": "circle",
      "properties": {
        "x": 320,
        "y": 220,
        "radius": 90,
        "color": "#1d3d8f"
      }
    },
    {
      "type": "createShape",
      "roleLabel": "outer-ring-text",
      "shape": "circle-text",
      "properties": {
        "x": 320,
        "y": 220,
        "radius": 120,
        "text": "POLICE",
        "fontSize": 18,
        "fontFamily": "Arial",
        "color": "#ffffff"
      }
    }
  ]
}
```

The exact schema may evolve, but every change must increment `schemaVersion`. The frontend validator must be updated in lockstep.

For simple SVG icon workflows, the planner may emit an image action with a free-form `svgPrompt`. A separate SVG-generation request resolves that prompt into sanitized `data:image/svg+xml` content before the scenario is applied.

### Backend API contract

The backend exposes a small HTTP surface for MVP.

#### `POST /api/generate`

**Request body:**

```json
{
  "prompt": "Create a gold sheriff badge with POLICE curved at the top",
  "stateSummary": {
    "canvasWidth": 640,
    "canvasHeight": 440,
    "objects": [
      {
        "roleLabel": "center-circle",
        "type": "circle",
        "x": 320,
        "y": 220,
        "radius": 90,
        "color": "#1d3d8f"
      }
    ],
    "selection": []
  }
}
```

#### `POST /api/generate-svg`

Purpose:

- resolve a free-form symbolic icon request into plain SVG markup
- run separately from the main scenario request
- return sanitized SVG data suitable for image placement

**Success response (200):**

```json
{
  "schemaVersion": "1",
  "goal": "human-readable description of the intended result",
  "actions": [ ... ]
}
```

**Error response (4xx / 5xx):**

```json
{
  "error": "short error code",
  "message": "human-readable explanation"
}
```

**Timeout:** the frontend should apply a request timeout of at least 30 seconds and surface a clear error if exceeded.

**Schema version mismatch:** if the response `schemaVersion` does not match what the frontend supports, the frontend must reject the scenario before showing it to the user and display a version mismatch error.

#### Available transport / orchestration options

- Option A: plain request/response HTTP only
- Best when planning is short-lived and execution remains local

- Option B: HTTP plus backend-side read-only planning helpers
- Best when the model benefits from measurement and fitting orchestration before returning a scenario

- Option C: Socket.IO or another streaming transport
- Best only if later phases require long-running planning, live progress, or collaboration

**Recommended MVP choice:** Option A, with Option B allowed only for read-only planning helpers.

### State summary for prompting

The frontend sends a compact, implementation-neutral summary rather than raw store state.

Required fields per object in the summary:

- `roleLabel` — the semantic role label assigned at creation time
- `type` — shape type (e.g. `circle`, `circle-text`, `rect`)
- key visual properties relevant to the shape type (position, size, color, text content)
- z-order index

Additional fields for fitting-relevant requests:

- circle or ring boundaries relevant to the target text
- candidate target objects by role, such as `outer ring` or `center circle`

Font information included in the summary is limited to the MVP-safe font list. The summary must not include internal store IDs, internal implementation fields, or raw store structures.

### Validation

Before applying any AI output, the frontend must verify:

- `schemaVersion` matches the supported version
- action type is in the allowed set
- shape type is in the allowed set
- required fields are present
- numeric values are within safe ranges
- `fontFamily` values are within the MVP-safe font list
- references to existing objects by role label are resolvable
- no unsupported fields are included

If validation fails for the entire scenario, the scenario must not be applied and the error must be shown to the user. If validation fails for individual actions within an otherwise valid scenario, those actions are treated as failed steps subject to the partial failure handling rules above.

### Apply model

For the MVP, actions are applied locally in the browser.

This keeps:

- canvas rendering deterministic
- IndexedDB ownership local
- undo/history consistent with existing behavior
- the backend stateless relative to the document

#### Available execution options

- Option A: backend-planned, frontend-executed
- Behavior: backend returns a scenario, frontend validates and mutates local state
- Pros: best fit for the current architecture
- Cons: frontend must own validation and execution rigor

- Option B: backend-executed document mutation
- Behavior: backend mutates the document and sends state back to the client
- Pros: centralized control
- Cons: conflicts with the current local-first editor model

- Option C: mixed execution depending on action type
- Behavior: some actions run locally and others remotely
- Pros: flexible
- Cons: higher complexity and harder-to-reason-about consistency

**Recommended MVP choice:** Option A.

### Undo and recovery

AI actions must be reversible.

Defined MVP behavior:

- when the user confirms a scenario, the current canvas state is snapshotted before any actions run
- after all actions are attempted (including partial failures), the entire batch is recorded as a single logical undo entry
- pressing undo once restores the canvas to the pre-scenario snapshot, regardless of how many individual actions ran
- this applies even when some actions were skipped due to failure

## Technical Architecture

### Frontend responsibilities

- host the editor UI
- keep the canvas state local
- send prompt requests with compact state summaries
- validate model output including schema version and field constraints
- render action plan summaries for user review
- require explicit user confirmation before executing any scenario
- execute validated actions against shared commands
- handle partial failures and display per-step warnings
- maintain role label to internal ID mapping

### Backend responsibilities

- accept prompt requests
- format the model prompt including system instructions and state summary
- enforce font restrictions in the prompt
- call the LLM
- return versioned structured scenarios
- optionally stream planning status later
- optionally orchestrate read-only layout and measurement tools before returning a final scenario

### Why backend is still useful in MVP

Even for a narrow MVP, a small backend is useful because:

- it protects API keys
- it centralizes prompt logic
- it allows swapping models without frontend changes
- it gives a clean place for schema-aware postprocessing

### Why Socket.IO is not required in MVP

Socket.IO is optional and should not be the starting point.

For the MVP, a simple request/response API is enough because:

- the agent is not truly long-running
- the action list is small
- there is no collaboration requirement
- streaming progress is nice to have, not core

Socket.IO becomes reasonable later if the team wants:

- progressive multi-step execution updates
- long-running agent workflows
- multiple connected viewers
- collaborative editing

## AI Design Constraints

The AI should be constrained to editor-safe actions.

The model should not:

- write raw store state directly
- write to IndexedDB directly
- execute arbitrary JavaScript
- invent unsupported shape types
- mutate the DOM directly
- perform hidden actions without user review
- emit font families outside the MVP-safe list
- emit internal object IDs in action payloads

The model should:

- return structured actions only
- use a limited tool vocabulary
- work against a documented schema
- include a `schemaVersion` field in every response
- assign a `roleLabel` to every object it creates
- describe intent clearly enough for user review
- call deterministic fitting tools for geometry-sensitive tasks instead of guessing numeric values
- substitute MVP-safe fonts when a user requests an unavailable font

### Prompting strategy for self-adjusting behavior

The prompt should tell the model when it must use fitting and measurement tools.

Examples of instructions that belong in the system prompt:

- If a request involves fitting text into a bounded area, do not guess `fontSize`, `radius`, or `kerning`.
- Use the fitting tools first, then emit the final action values returned by the tools.
- If the requested text cannot fit cleanly, return a plan with a warning and a fallback proposal.
- Prefer deterministic layout calculations over stylistic guessing.
- Only use fonts from the approved list: Arial, Courier New. Substitute the closest approved font if the user requests another and note the substitution.
- Assign a meaningful `roleLabel` to every object you create.

The model prompt should also define when to ask for:

- clarification
- automatic fallback to a smaller font
- automatic reduction of padding
- a different font recommendation from the approved list

This is a prompt concern and a tooling concern. Prompting alone is not sufficient.

## Risks

### Product risks

- Users may prefer manual editing and ignore AI.
- Generated layouts may be technically valid but visually weak.
- The current shape vocabulary may be too limited for compelling outputs.
- Follow-up prompts may feel inconsistent if role label inference is ambiguous.

### Technical risks

- The current store architecture does not yet expose a clean command bus for AI execution.
- Partial scenario execution may produce unexpected intermediate states that users find confusing.
- Snapshot history may become noisy after AI-driven multi-step edits — mitigated by collapsing each confirmed scenario into a single undo entry.
- The current alignment path already mutates frozen objects and should be fixed before AI builds on it.
- Browser-local assets such as fonts and uploaded images are not naturally available to a backend planner — mitigated by restricting fonts to the MVP-safe list.
- Text fitting quality may vary across devices if browser text measurement differs between environments.

### UX risks

- Users may not trust opaque AI edits — mitigated by the mandatory plan review and confirm step.
- Long prompts can generate vague or conflicting instructions.
- If results are poor, users may blame the editor rather than the AI layer.
- Partial failure warnings may confuse users who expected all-or-nothing behavior.

## Things We Should Not Do

- Do not fork the current app into a separate AI repo.
- Do not make the backend the source of truth for canvas state in MVP.
- Do not let the model emit raw JSON patches against internal store structures.
- Do not let the model emit internal object IDs in action payloads.
- Do not start with a fully autonomous agent that can call arbitrary tools.
- Do not introduce Socket.IO before proving the simpler request/response flow.
- Do not promise "design intelligence" beyond what the constrained layout system can actually deliver.
- Do not allow `replaceCanvas` to execute silently as part of an AI scenario without a separate explicit confirmation.
- Do not allow fonts outside the MVP-safe list to be emitted in action payloads.

## Why We Should Still Do It

- The app is already constrained enough for tool-based generation to be realistic.
- The feature is easy to explain and demo.
- It can expand the audience beyond users who want to draw every element manually.
- It creates a path toward prompt-assisted editing without throwing away the current product.

## Decisions

The following decisions have been made for the MVP and are no longer open questions:

| Decision | Choice | Rationale |
|---|---|---|
| AI-generated scenarios: immediate or confirmation required? | Always require confirmation | Matches "make changes inspectable and reversible" principle; easy to relax later |
| How AI refers to existing objects | Role labels inferred by the model | Simpler for the model; avoids exposing internal IDs; natural language-aligned |
| Partial failure behavior | Apply completed steps, skip failed ones, warn user | Preserves useful work; user can undo the whole batch if needed |
| MVP-safe fonts | Arial, Courier New | Universally available across target environments |

## Open Questions

- Should the MVP support variant generation, or only one result per prompt?
- Should AI mode start from an empty canvas only, or also support editing existing layouts from day one?
- How much schema complexity is justified before the value of the feature is proven?
- Should fitting and text measurement run only in the frontend for browser-accurate results, or can some read-only planning run on the backend?

## Recommended MVP Decisions

- Keep one repo.
- Keep one shared editor core.
- Add a small backend for LLM calls.
- Use plain HTTP for MVP, not Socket.IO.
- Return versioned structured scenarios, not free-form text.
- Validate everything on the client before applying, including schema version and font family.
- Execute actions locally.
- Always show a plan and require explicit user confirmation before apply.
- Handle partial failures gracefully: apply completed steps, skip and warn on failures, treat the batch as one undo entry.
- Keep the first action set small.
- Add one deterministic circle-text fitting tool in MVP.
- Restrict fonts to Arial and Courier New in MVP.
- Use role labels for object targeting; keep internal IDs out of the AI layer.

## Phased Delivery Plan

### Phase 1: foundation

- extract or define a shared editor command layer
- fix command paths that currently rely on unsafe mutation
- define scenario JSON schema with `schemaVersion`
- define state summary schema including role label field
- add action validator (schema version, allowed types, font allowlist, numeric bounds)
- add role label assignment and resolution logic
- add deterministic text measurement and circle-text fitting primitives
- define and document the `POST /api/generate` API contract

### Phase 2: basic AI mode

- add AI mode UI
- add prompt input, plan summary panel, confirm/apply button, and warning display
- add backend endpoint implementing the defined API contract
- generate and apply scenarios for create-from-scratch prompts
- enforce MVP-safe font list in backend prompt and frontend validator
- support fitting-based curved text generation through the tool layer
- implement single-entry undo for confirmed scenarios

### Phase 3: iterative edits

- allow prompts against existing canvas state
- support update, align, reorder, and remove actions
- improve role label inference and resolution
- improve state summary quality for follow-up prompts

### Phase 4: evaluation

- review prompt success rate
- review common failure patterns and partial failure frequency
- decide whether streaming, templates, or collaboration are worth adding
- decide whether font list should be expanded

## Acceptance Criteria

- The existing client-only mode still works with no backend.
- AI mode can generate a badge draft from a natural-language prompt, for example: *"Create a gold sheriff-style badge with curved top text saying POLICE, a blue circle in the center, and a star shape."* The result must produce a visually recognizable badge with the described elements on the canvas.
- AI mode uses only a documented, validated action schema.
- Every scenario requires explicit user confirmation before the canvas is modified.
- AI-generated changes can be undone in a single undo step.
- A user can manually refine the AI result with existing editor tools.
- Follow-up prompt edits work on at least a basic set of operations (recolor, resize, align).
- Partial scenario failures surface a per-step warning; completed steps are preserved.
- The backend is not the source of truth for the canvas document.
- Geometry-sensitive requests such as fitting curved text between circles use deterministic fitting logic rather than model-only guesses.
- No font outside Arial or Courier New can appear in an executed action payload.
- The `replaceCanvas` command cannot execute as part of an AI scenario without a separate explicit confirmation.

## Summary

The MVP should be a narrow, tool-driven assistant layered on top of the existing editor, not a separate product and not a free-form autonomous agent. The right first step is to preserve the current browser editor, add a small backend for model calls, and let the frontend safely apply validated AI scenarios through shared commands. All AI changes require explicit user confirmation, use role labels for object targeting, handle partial failures gracefully with per-step warnings, and are always undoable in a single step. Fonts are restricted to Arial and Courier New for the MVP.

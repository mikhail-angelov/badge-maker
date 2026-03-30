# Plan 2: Circle-Text and Centered-Text Quality Pass

## Goal

Make ring text and center text visually correct, deterministic, and safe for AI-generated badges.

This plan focuses on the remaining quality gap after the initial hardening work:

- long ring text can still look cramped even when it is technically valid
- ring text fitting still relies on approximations that differ from renderer behavior
- center text placement still depends on heuristics instead of an explicit layout model
- invalid-but-readable requests should produce deterministic fallbacks or clear warnings

## Scope

In scope:

- circle-text layout policy
- renderer-aware measurement
- annulus clearance rules
- center-text anchor model
- validation and fallback behavior
- browser and unit verification

Out of scope:

- arbitrary decorative typography
- multi-line freeform text layout outside badge use cases
- non-circular curved paths

## Current Problems

1. Top-arc ring text is treated as a single default layout even when the string is too long for that layout.
2. Fitting math uses simplified text estimates, while the renderer uses canvas/browser metrics differently.
3. Clearance from inner and outer circle strokes is not enforced as a first-class rule.
4. Center text is inferred from circle geometry, but the model and renderer do not share an explicit semantic anchor.
5. The planner can still generate visually poor but technically executable text layouts.

## Design Principles

1. The browser renderer is the source of truth for text measurement.
2. Layout quality should be deterministic, not model-dependent.
3. Fallbacks should be explicit and ordered.
4. Bad requests should be rejected when safe fallback is not possible.
5. Validation should protect visual quality, not just runtime correctness.

## Phase 1: Layout Model

Status: in progress

### Objective

Introduce explicit text layout modes instead of relying on one implicit top-arc behavior.

### Tasks

- Define circle-text layout modes such as:
  - `top-arc`
  - `bottom-arc`
  - `full-ring`
  - `split-ring`
- Define center-text anchor semantics such as:
  - exact center point
  - centered horizontal alignment
  - centered vertical baseline
- Decide which layout properties are internal normalization hints vs persisted shape properties.
- Document deterministic fallback order for long ring text.

### Likely files

- [`src/core/scenario/schema.js`](/Users/ma/repo/badge-maker/src/core/scenario/schema.js)
- [`src/core/scenario/normalizeScenario.js`](/Users/ma/repo/badge-maker/src/core/scenario/normalizeScenario.js)
- [`src/core/roles/buildStateSummary.js`](/Users/ma/repo/badge-maker/src/core/roles/buildStateSummary.js)
- [`docs/prd.md`](/Users/ma/repo/badge-maker/docs/prd.md)

### Exit criteria

- Layout modes and center-anchor semantics are clearly defined.
- The fallback order is written down and stable.
- State summaries can expose enough information for follow-up prompting.

Current status:

- [x] Define explicit persisted layout metadata via `layoutMode` for ring text and `anchor` for centered inner text.
- [x] Default AI-normalized ring text to `top-arc` and centered inner text to `anchor="center"` where appropriate.
- [x] Surface layout metadata in state summaries and human-readable plan previews.
- [~] Decide which layout properties should remain internal hints versus manual-editable properties in the UI.

## Phase 2: Renderer-Aware Measurement

Status: in progress

### Objective

Make fitting logic use the same measurement basis as the actual canvas renderer.

### Tasks

- Add a shared text-measurement utility that uses browser/canvas metrics for:
  - glyph width
  - text height
  - angular span
  - baseline-to-stroke clearance
- Remove or minimize divergent approximations between fitting helpers and rendering code.
- Add a way to measure ring text against a concrete target radius and arc span.
- Keep a deterministic fallback approximation only for non-browser unit paths if needed.

Current status:

- [x] Add a shared browser-aware text measurement utility with a deterministic non-browser fallback.
- [x] Thread measured `fontFamily`-aware text dimensions through the shared fitter path.
- [x] Reuse the shared measurement path in the canvas renderer for text box and circle-text height calculations.
- [~] Add a dedicated arc-span and baseline-clearance helper instead of relying on height/radius calculations alone.

### Likely files

- [`src/store/shaper.js`](/Users/ma/repo/badge-maker/src/store/shaper.js)
- [`src/core/fitting/measureTextBox.js`](/Users/ma/repo/badge-maker/src/core/fitting/measureTextBox.js)
- [`src/core/fitting/measureCircleText.js`](/Users/ma/repo/badge-maker/src/core/fitting/measureCircleText.js)
- [`src/core/fitting/fitCircleTextBetweenRadii.js`](/Users/ma/repo/badge-maker/src/core/fitting/fitCircleTextBetweenRadii.js)

### Exit criteria

- The fitter and renderer agree on text dimensions closely enough to avoid visible drift.
- Long strings can be evaluated against actual available arc span before apply.

## Phase 3: Stroke Clearance and Fitting Rules

Status: in progress

### Objective

Enforce visual spacing between ring text and both circle strokes.

### Tasks

- Add explicit minimum clearance rules for:
  - inner stroke
  - outer stroke
  - top arc edges
- Update fitting so it solves for:
  - readable font size
  - legal radius
  - legal arc span
- Add ordered fallback behavior:
  1. fit requested top arc
  2. reduce font size within bounds
  3. widen layout mode if allowed
  4. split ring text if policy permits
  5. reject with a warning if none fit cleanly
- Add collision detection for ring text against both ring boundaries.

### Likely files

- [`src/core/fitting/sanitizeCircleTextGeometry.js`](/Users/ma/repo/badge-maker/src/core/fitting/sanitizeCircleTextGeometry.js)
- [`src/core/fitting/fitCircleTextBetweenRadii.js`](/Users/ma/repo/badge-maker/src/core/fitting/fitCircleTextBetweenRadii.js)
- [`src/core/fitting/detectCircleTextCollision.js`](/Users/ma/repo/badge-maker/src/core/fitting/detectCircleTextCollision.js)
- [`src/core/commands/index.js`](/Users/ma/repo/badge-maker/src/core/commands/index.js)

### Exit criteria

- Ring text never intersects inner or outer circle strokes in valid scenarios.
- Long ring text either fits cleanly via fallback or is rejected deterministically.

Current status:

- [x] Add first-pass radial collision reporting in `detectCircleTextCollision.js`.
- [x] Solve ring-text placement against padded annulus bounds instead of a raw midpoint radius.
- [x] Support explicit `full-ring` layout semantics in fitting and validation paths.
- [~] Tighten true rejection/fallback behavior for cases that remain technically valid but visually cramped.

## Phase 4: Center-Text Anchoring

Status: in progress

### Objective

Replace heuristic center-label placement with an explicit centered-text model.

### Tasks

- Add a canonical center-anchor path for badge initials and middle labels.
- Make renderer, bounding-box logic, and selection outlines agree on centered text.
- Ensure rotation, selection outlines, and property edits still behave correctly with center anchoring.
- Normalize AI-generated center text onto exact inner-circle centers when appropriate.

### Likely files

- [`src/store/shaper.js`](/Users/ma/repo/badge-maker/src/store/shaper.js)
- [`src/core/scenario/normalizeScenario.js`](/Users/ma/repo/badge-maker/src/core/scenario/normalizeScenario.js)
- [`src/components/propertiesPanel.js`](/Users/ma/repo/badge-maker/src/components/propertiesPanel.js)

### Exit criteria

- Center text is visually centered in the badge, not just numerically near the center.
- Bounding boxes and selection affordances remain correct.

Current status:

- [x] Normalize badge-center labels onto exact inner-circle centers when appropriate.
- [x] Make renderer and text bounding-box calculations respect centered anchors.
- [~] Verify more manual editing paths for centered text, especially rotation and direct property edits.

## Phase 5: Validation and Planner Constraints

Status: in progress

### Objective

Prevent the LLM from producing low-quality text layouts that should never be applied.

### Tasks

- Add validation errors or warnings for:
  - top arc too long for requested layout
  - ring text violating stroke clearance
  - center text missing anchor semantics when required
- Extend prompt guidance with:
  - exact ring text preservation
  - preferred layout modes
  - centered inner-label requirements
  - examples of acceptable long-text behavior
- Decide when to auto-correct vs reject.

### Likely files

- [`src/core/scenario/validateAction.js`](/Users/ma/repo/badge-maker/src/core/scenario/validateAction.js)
- [`src/core/scenario/validateScenario.js`](/Users/ma/repo/badge-maker/src/core/scenario/validateScenario.js)
- [`server/prompts/systemPrompt.js`](/Users/ma/repo/badge-maker/server/prompts/systemPrompt.js)
- [`server/prompts/formatGenerateRequest.js`](/Users/ma/repo/badge-maker/server/prompts/formatGenerateRequest.js)

### Exit criteria

- Visually bad layouts are blocked before apply.
- The planner gets clear deterministic guidance for long ring text and centered text.

Current status:

- [x] Validate explicit `layoutMode` and `anchor` values.
- [x] Extend Deepseek prompt guidance and examples for ring layout modes and centered inner labels.
- [x] Add stronger pre-apply warnings or rejection for visually poor but technically executable layouts.

## Phase 6: Test and Verification Pass

Status: in progress

### Objective

Prove that the new layout system is both correct and stable.

### Tasks

- Add unit coverage for:
  - short top-arc text
  - long top-arc text that shrinks but remains valid
  - long top-arc text that must fall back or reject
  - inner/outer stroke clearance
  - center-text true centering
  - outline and hitbox consistency for centered text
- Add browser verification for:
  - exact ring text preservation
  - no visible stroke intersections
  - correct center-label placement
  - no console errors
- Add code-side image validation checks for:
  - dark text pixels in the annulus
  - no dark text spill across forbidden radii
  - balanced pixel distribution for centered initials

Current status:

- [x] Add unit coverage for renderer-aware measurement, explicit full-ring layout support, and centered-anchor metadata.
- [x] Re-run the Deepseek browser flow for the exact punctuation-heavy JS badge prompt after the measurement changes.
- [x] Add code-side canvas checks for ring visibility, forbidden-radius spill, and centered-initial visibility.
- [~] Add broader rejection-case browser verification after later layout-mode and validation phases land.

### Likely files

- [`tests/circleTextFitting.test.js`](/Users/ma/repo/badge-maker/tests/circleTextFitting.test.js)
- [`tests/executeScenarioBatch.test.js`](/Users/ma/repo/badge-maker/tests/executeScenarioBatch.test.js)
- [`docs/manual-test-checklist.md`](/Users/ma/repo/badge-maker/docs/manual-test-checklist.md)

### Exit criteria

- Automated tests cover the main regression cases.
- Browser checks confirm visual correctness for real Deepseek generations.
- Programmatic image checks pass for representative badge prompts.

## Recommended Implementation Order

1. Phase 1: lock the layout model
2. Phase 2: unify measurement with the renderer
3. Phase 3: enforce clearance and fallback policy
4. Phase 4: formalize centered text
5. Phase 5: tighten validation and prompt guidance
6. Phase 6: finish with automated and browser verification

## Suggested First Milestone

Deliver this first:

1. renderer-aware measurement utility
2. ring-text clearance enforcement
3. exact center-anchor rendering for middle text
4. one Deepseek browser scenario proving:
   - exact ring text preserved
   - no ring/stroke intersections
   - center initials visually centered

## Definition of Done

- long ring text is either cleanly laid out or explicitly rejected
- no valid ring text intersects either concentric circle stroke
- center text uses explicit centered semantics, not positional guesswork
- fitting decisions are deterministic and renderer-aligned
- the LLM is constrained to layouts the frontend can render well
- browser verification and code-side pixel checks both pass

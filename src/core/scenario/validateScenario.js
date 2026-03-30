import { SCENARIO_SCHEMA_VERSION } from "./schema.js";
import { normalizeScenario } from "./normalizeScenario.js";
import { validateAction } from "./validateAction.js";

export const validateScenario = (scenario) => {
  const errors = [];
  const warnings = [];
  const normalizedScenario = normalizeScenario(scenario);

  if (!normalizedScenario || typeof normalizedScenario !== "object" || Array.isArray(normalizedScenario)) {
    return {
      ok: false,
      errors: ["Scenario must be an object"],
      warnings,
      scenario: null,
    };
  }

  if (normalizedScenario.schemaVersion !== SCENARIO_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${SCENARIO_SCHEMA_VERSION}`);
  }

  if (!Array.isArray(normalizedScenario.actions) || normalizedScenario.actions.length === 0) {
    errors.push("actions must be a non-empty array");
  } else {
    normalizedScenario.actions.forEach((action, index) => {
      const validation = validateAction(action, index);
      errors.push(...validation.errors);
      warnings.push(...validation.warnings);
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    scenario: errors.length === 0 ? structuredClone(normalizedScenario) : null,
  };
};

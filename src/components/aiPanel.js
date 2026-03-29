import { executeScenarioBatch } from "../core/commands/executeScenarioBatch.js";
import { generateScenario } from "../core/api/generateScenario.js";
import { formatScenarioSummary } from "../core/scenario/formatScenarioSummary.js";
import { validateScenario } from "../core/scenario/validateScenario.js";

class AIPanel {
  constructor(container, store) {
    this.container = container;
    this.store = store;
    this.prompt = "";
    this.pendingScenario = null;
    this.status = "Describe a badge to generate a Deepseek plan.";
    this.error = "";
    this.results = [];

    this.store.on("stateChange", this.render.bind(this));
    this.render();
  }

  setState(nextState) {
    Object.assign(this, nextState);
    this.render();
  }

  handlePromptInput(value) {
    this.prompt = value;
  }

  async handleGenerate() {
    this.setState({
      status: "Generating plan...",
      error: "",
      results: [],
    });

    const scenario =
      await generateScenario({
        prompt: this.prompt,
        stateSummary: this.store.getStateSummary(),
      });

    const validation = validateScenario(scenario);

    if (!validation.ok) {
      this.setState({
        pendingScenario: null,
        error: validation.errors.join("\n"),
        status: "The generated scenario is invalid.",
        results: [],
      });
      return;
    }

    this.setState({
      pendingScenario: validation.scenario,
      error: "",
      status: "Preview ready. Review and confirm before apply.",
      results: [],
    });
  }

  getGenerateButtonLabel() {
    const hasExistingObjects = this.store.getStateSummary().objectCount > 0;
    if (hasExistingObjects) {
      return "Preview Refinement Plan";
    }
    return "Preview Deepseek Plan";
  }

  getPromptPlaceholder() {
    const hasExistingObjects = this.store.getStateSummary().objectCount > 0;
    if (hasExistingObjects) {
      return "Example: change top-text to SHERIFF, make it white, and move center-icon to front";
    }
    return "Create a gold sheriff badge with curved top text";
  }

  async handleApply() {
    if (!this.pendingScenario) {
      return;
    }

    const result = await executeScenarioBatch(this.store, this.pendingScenario, {
      historyAction: "scenario",
    });

    this.setState({
      status: result.ok
        ? "Scenario applied."
        : "Scenario applied with skipped steps. Review warnings below.",
      error: "",
      results: result.results,
      pendingScenario: null,
    });
  }

  handleCancel() {
    this.setState({
      pendingScenario: null,
      results: [],
      error: "",
      status: "Scenario preview cleared.",
    });
  }

  bindEvents() {
    this.container.querySelector("#ai-prompt").addEventListener("input", (event) => {
      this.handlePromptInput(event.target.value);
    });
    this.container
      .querySelector("#generate-ai-plan")
      .addEventListener("click", async () => {
        try {
          await this.handleGenerate();
        } catch (error) {
          this.setState({
            pendingScenario: null,
            error: error.message,
            status: "Failed to generate a plan.",
            results: [],
          });
        }
      });
    this.container.querySelector("#cancel-ai-plan")?.addEventListener("click", () => {
      this.handleCancel();
    });
    this.container.querySelector("#apply-ai-plan")?.addEventListener("click", async () => {
      await this.handleApply();
    });
  }

  renderResults() {
    if (!this.results.length) {
      return "";
    }

    return `
      <div class="ai-results">
        <h3>Execution</h3>
        <ul>
          ${this.results
            .map(
              (result) => `
                <li class="${result.ok ? "ok" : "error"}">
                  Step ${result.stepIndex + 1}: ${result.ok ? "applied" : result.message}
                </li>
              `
            )
            .join("")}
        </ul>
      </div>
    `;
  }

  render() {
    const stateSummaryObject = this.store.getStateSummary();
    const preview = this.pendingScenario
      ? formatScenarioSummary(this.pendingScenario)
      : "No plan generated yet.";
    const stateSummary = JSON.stringify(stateSummaryObject, null, 2);
    const isRefinement = stateSummaryObject.objectCount > 0;

    this.container.innerHTML = `
      <div class="ai-panel-card">
        <h2 class="title">AI Mode</h2>
        <label class="label" for="ai-prompt">Prompt</label>
        <textarea id="ai-prompt" rows="5" placeholder="${this.getPromptPlaceholder()}">${this.prompt}</textarea>
        <div class="row ai-actions">
          <button id="generate-ai-plan">${this.getGenerateButtonLabel()}</button>
          ${this.pendingScenario ? '<button id="apply-ai-plan">Apply</button>' : ""}
          ${this.pendingScenario ? '<button id="cancel-ai-plan">Cancel</button>' : ""}
        </div>
        <div class="ai-preview">
          <h3>Plan Preview</h3>
          <pre>${preview}</pre>
        </div>
        <div class="ai-preview">
          <h3>State Summary</h3>
          <pre>${stateSummary}</pre>
        </div>
        ${this.error ? `<div class="ai-error">${this.error}</div>` : ""}
        ${this.renderResults()}
      </div>
    `;

    this.bindEvents();
  }
}

export default AIPanel;

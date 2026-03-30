import { executeScenarioBatch } from "../core/commands/executeScenarioBatch.js";
import { generateScenario } from "../core/api/generateScenario.js";
import { validateScenario } from "../core/scenario/validateScenario.js";

class AIPanel {
  constructor(container, store) {
    this.container = container;
    this.store = store;
    this.prompt = "";
    this.scenarioText = "";
    this.status = "Describe a badge to generate a Deepseek plan.";
    this.error = "";
    this.warnings = [];
    this.progress = [];

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

  handleScenarioInput(value) {
    this.scenarioText = value;
  }

  pushProgress(message) {
    if (!message) {
      return;
    }

    const progress = this.progress[this.progress.length - 1] === message
      ? this.progress
      : [...this.progress, message];

    this.setState({
      status: message,
      progress,
    });
  }

  async handleGenerate() {
    this.setState({
      status: "Generating plan...",
      error: "",
      warnings: [],
      progress: ["Generating plan..."],
    });

    const generation =
      await generateScenario({
        prompt: this.prompt,
        stateSummary: this.store.getStateSummary(),
        onStatus: (event) => {
          this.pushProgress(event.message);
        },
      });

    const validation = validateScenario(generation.scenario);
    const nextWarnings = [...new Set([...(generation.warnings || []), ...(validation.warnings || [])])];

    if (!validation.ok) {
      this.setState({
        error: validation.errors.join("\n"),
        warnings: nextWarnings,
        progress: [...this.progress, "The generated scenario is invalid."],
        scenarioText: "",
        status: "The generated scenario is invalid.",
      });
      return;
    }

    this.setState({
      scenarioText: JSON.stringify(validation.scenario, null, 2),
      error: "",
      warnings: nextWarnings,
      progress: [...this.progress, "Preview ready. Review and confirm before apply."],
      status: "Preview ready. Review and confirm before apply.",
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

  shouldReplaceExistingCanvas(scenario) {
    return (scenario.actions || []).every((action) => {
      if (action.type === "createShape" || action.type === "clearSelection") {
        return true;
      }

      if (action.type === "replaceCanvas") {
        return true;
      }

      return false;
    });
  }

  async handleApply() {
    if (!this.scenarioText.trim()) {
      return;
    }

    let parsedScenario;
    try {
      parsedScenario = JSON.parse(this.scenarioText);
    } catch (error) {
      this.setState({
        error: "Scenario JSON is not valid JSON.",
        status: "Fix the scenario JSON before apply.",
      });
      return;
    }

    const validation = validateScenario(parsedScenario);
    if (!validation.ok) {
      this.setState({
        error: validation.errors.join("\n"),
        warnings: validation.warnings || [],
        status: "Fix the scenario JSON before apply.",
      });
      return;
    }

    const result = await executeScenarioBatch(this.store, validation.scenario, {
      historyAction: "scenario",
      replaceExistingCanvas: this.shouldReplaceExistingCanvas(validation.scenario),
    });

    this.setState({
      status: result.ok
        ? "Scenario applied. You can edit the JSON and apply again."
        : "Scenario was not applied. Fix the JSON or warnings and try again.",
      error: result.ok ? "" : "Scenario could not be applied safely.",
      warnings: result.ok ? [] : validation.warnings || [],
      progress: result.ok ? [] : this.progress,
    });
  }

  handleCancel() {
    this.setState({
      scenarioText: "",
      error: "",
      warnings: [],
      progress: [],
      status: "Scenario JSON cleared.",
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
            scenarioText: "",
            error: error.message,
            status: "Failed to generate a plan.",
            progress: [...this.progress, "Failed to generate a plan."],
          });
        }
      });
    this.container.querySelector("#scenario-json")?.addEventListener("input", (event) => {
      this.handleScenarioInput(event.target.value);
    });
    this.container.querySelector("#clear-ai-plan")?.addEventListener("click", () => {
      this.handleCancel();
    });
    this.container.querySelector("#apply-ai-plan")?.addEventListener("click", async () => {
      await this.handleApply();
    });
  }

  renderWarnings() {
    if (!this.warnings.length) {
      return "";
    }

    return `
      <div class="ai-warnings">
        <h3>Pre-Apply Warnings</h3>
        <ul>
          ${this.warnings.map((warning) => `<li>${warning}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  renderStatus() {
    const progressMarkup = this.progress.length
      ? `
        <ul>
          ${this.progress.map((message) => `<li>${message}</li>`).join("")}
        </ul>
      `
      : "";

    return `
      <div class="ai-status">
        <h3>Status</h3>
        <p>${this.status}</p>
        ${progressMarkup}
      </div>
    `;
  }

  render() {
    this.container.innerHTML = `
      <div class="ai-panel-card">
        <h2 class="title">AI Mode</h2>
        <label class="label" for="ai-prompt">Prompt</label>
        <textarea id="ai-prompt" rows="5" placeholder="${this.getPromptPlaceholder()}">${this.prompt}</textarea>
        <div class="row ai-actions">
          <button id="generate-ai-plan">${this.getGenerateButtonLabel()}</button>
          ${this.scenarioText.trim() ? '<button id="apply-ai-plan">Apply</button>' : ""}
          ${this.scenarioText.trim() ? '<button id="clear-ai-plan">Clear</button>' : ""}
        </div>
        ${this.renderStatus()}
        <div class="ai-preview">
          <h3>State Summary / Scenario JSON</h3>
          <textarea id="scenario-json" rows="18" spellcheck="false" placeholder="Generated scenario JSON will appear here.">${this.scenarioText}</textarea>
        </div>
        ${this.renderWarnings()}
        ${this.error ? `<div class="ai-error">${this.error}</div>` : ""}
      </div>
    `;

    this.bindEvents();
  }
}

export default AIPanel;

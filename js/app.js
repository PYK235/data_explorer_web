import { els } from "./dom/elements.js";
import { state } from "./state/appState.js";
import { applyFilter } from "./controllers/datasetController.js";
import { renderCompareBoards, renderMetrics } from "./controllers/chartController.js";
import { bindEvents } from "./controllers/eventBinder.js";
import { syncControls, updateAlgorithmButtons } from "./controllers/uiController.js";

function refreshAll() {
  applyFilter(state, els);
  renderMetrics(state, els);
  renderCompareBoards(state, els);
  updateAlgorithmButtons(state);
}

syncControls(state, els);
bindEvents(state, els, refreshAll);
refreshAll();

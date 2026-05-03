import { els } from "./dom/elements.js";
import { state } from "./state/appState.js";
import { applyFilter } from "./controllers/datasetController.js";
import { renderCompareBoards, renderMetrics } from "./controllers/chartController.js";
import { bindEvents } from "./controllers/eventBinder.js";
import { syncControls, updateAlgorithmButtons } from "./controllers/uiController.js";

function applySnapshotMode() {
  const params = new URLSearchParams(window.location.search);
  const snapshot = params.get("snapshot");
  if (!snapshot) return;

  document.body.classList.add("snapshot-mode", `snapshot-${snapshot}`);
}

async function refreshAll() {
  applyFilter(state, els);
  await renderMetrics(state, els);
  renderCompareBoards(state, els);
  updateAlgorithmButtons(state);
  els.predictResult.innerHTML = state.predictionResult;
}

syncControls(state, els);
bindEvents(state, els, refreshAll);
await refreshAll();
applySnapshotMode();

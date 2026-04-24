import { defaultDataset } from "../data/mockData.js";
import { applyFilter } from "./datasetController.js";
import { renderMetrics, renderCompareBoards, rerenderMainScatter } from "./chartController.js";
import { resetToSampleData } from "../state/appState.js";
import { readCsvFile } from "../services/fileParser.js";
import { uploadDatasetToBackend, fetchClusteringResults } from "../services/api.js";
import { syncControls, updateClusterLabel, updateAlgorithmButtons } from "./uiController.js";

export function bindEvents(state, els, refreshAll) {

  // ===== NAV =====
  document.querySelectorAll(".nav-link").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-link").forEach(i => i.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // ===== ALGORITHM =====
  document.querySelectorAll(".algo-chip").forEach(btn => {
    btn.addEventListener("click", async () => {
      state.algorithm = btn.dataset.algoCard;

      await runKMeans(state);

      updateClusterLabel(state, els);
      renderMetrics(state, els);
      updateAlgorithmButtons(state);
      rerenderMainScatter(state, els);
    });
  });

  // ===== SELECT =====
  els.algorithmSelect.addEventListener("change", async (e) => {
    state.algorithm = e.target.value;

    await runKMeans(state);

    renderMetrics(state, els);
    rerenderMainScatter(state, els);
  });

  // ===== SLIDER K =====
  els.clusterRange.addEventListener("input", async (e) => {
    state.clusterK = Number(e.target.value);

    updateClusterLabel(state, els);

    await runKMeans(state);

    rerenderMainScatter(state, els);
    renderCompareBoards(state, els);
  });

  // ===== FILTER =====
  els.filterSelect.addEventListener("change", () => {
    state.filteredRows = applyFilter(state);
    rerenderMainScatter(state, els);
  });

  // ===== SAMPLE =====
  els.sampleBtn.addEventListener("click", () => {
    resetToSampleData();
    refreshAll();
  });

  // ===== REFRESH =====
  els.refreshBtn.addEventListener("click", refreshAll);

  // ===== FILE UPLOAD =====
  els.fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

     state.datasetName = file.name;
     
    if (file.name.match(/\.(xlsx|xls)$/i)) {
      const res = await uploadDatasetToBackend(file);

      if (res.ok) {
        state.rows = res.data.data;
      } else {
        state.rows = [...defaultDataset];
      }

      await runKMeans(state);
      refreshAll();
      return;
    }

    try {
      const rows = await readCsvFile(file);
      state.rows = rows.length ? rows : [...defaultDataset];
    } catch {
      state.rows = [...defaultDataset];
    }

    await runKMeans(state);
    refreshAll();
  });
}

// ===== HELPER =====
async function runKMeans(state) {
  if (state.algorithm !== "kmeans") return;
  if (!state.rows?.length) return;

  const res = await fetchClusteringResults({
    data: state.rows,
    k: state.clusterK
  });

  if (res.ok) {
    state.labels = res.result.labels;
    state.centroids = res.result.centroids;
    state.silhouette = res.result.silhouette;
  }
}
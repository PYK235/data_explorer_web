import { defaultDataset } from "../data/mockData.js";
import { applyFilter } from "./datasetController.js";
import { renderMetrics, renderCompareBoards, rerenderMainScatter } from "./chartController.js";
import { resetToSampleData } from "../state/appState.js";
import { readCsvFile } from "../services/fileParser.js";
import {
  uploadDatasetToBackend,
  fetchClusteringResults,
  fetchDbscanResults,
  runHierarchical
} from "../services/api.js";

import {
  syncControls,
  updateClusterLabel,
  updateAlgorithmButtons,
  showDbscanControls,
  hideDbscanControls,
  updateDbscanNoiseCount
} from "./uiController.js";

// ================= MAIN =================
export function bindEvents(state, els, refreshAll) {

  // ================= NAV =================
  document.querySelectorAll(".nav-link").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-link").forEach(i => i.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // ================= ALGO BUTTON =================
  document.querySelectorAll(".algo-chip").forEach(btn => {
    btn.addEventListener("click", async () => {
      state.algorithm = btn.dataset.algoCard;

      els.algorithmSelect.value = state.algorithm;
      updateAlgorithmButtons(state);

      handleAlgorithmUI(state, els);

      await runAlgorithm(state);

      updateClusterLabel(state, els);
      renderMetrics(state, els);
      rerenderMainScatter(state, els);
    });
  });

  // ================= SELECT =================
  els.algorithmSelect.addEventListener("change", async (e) => {
    state.algorithm = e.target.value;

    updateAlgorithmButtons(state);

    handleAlgorithmUI(state, els);

    await runAlgorithm(state);

    updateClusterLabel(state, els);
    renderMetrics(state, els);
    rerenderMainScatter(state, els);
  });

  // ================= SLIDER K =================
  els.clusterRange.addEventListener("input", async (e) => {
    state.clusterK = Number(e.target.value);

    updateClusterLabel(state, els);

    await runAlgorithm(state);

    rerenderMainScatter(state, els);
    renderCompareBoards(state, els);
  });

  // ================= FILTER =================
  els.filterSelect.addEventListener("change", () => {
    state.filteredRows = applyFilter(state);
    rerenderMainScatter(state, els);
  });

  // ================= SAMPLE =================
  els.sampleBtn.addEventListener("click", () => {
    resetToSampleData();
    refreshAll();
  });

  // ================= REFRESH =================
  els.refreshBtn.addEventListener("click", refreshAll);

  // ================= FILE UPLOAD =================
  els.fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    state.datasetName = file.name;

    if (file.name.match(/\.(xlsx|xls)$/i)) {
      const res = await uploadDatasetToBackend(file);
      state.rows = res.ok ? res.data.data : [...defaultDataset];

      await runAlgorithm(state);
      refreshAll();
      return;
    }

    try {
      const rows = await readCsvFile(file);
      state.rows = rows.length ? rows : [...defaultDataset];
    } catch {
      state.rows = [...defaultDataset];
    }

    await runAlgorithm(state);
    refreshAll();
  });
}

// ================= UI CONTROL =================
function handleAlgorithmUI(state, els) {
  if (state.algorithm === "dbscan") {
    showDbscanControls(
      state,
      async () => {
        await runAlgorithm(state);
        renderMetrics(state, els);
        updateDbscanNoiseCount(state.dbscanNoise);
      },
      async () => {
        await runAlgorithm(state);
        renderMetrics(state, els);
        updateDbscanNoiseCount(state.dbscanNoise);
      }
    );
  } else {
    hideDbscanControls();
  }
}

// ================= CORE =================
async function runAlgorithm(state) {
  if (!state.rows?.length) return;

  console.log("Running:", state.algorithm);

  if (state.algorithm === "kmeans") {
    await runKMeans(state);
  } 
  else if (state.algorithm === "dbscan") {
    await runDbscan(state);
  } 
  else if (state.algorithm === "hierarchical") {
    await runHierarchicalAlgo(state);
  }
}

// ================= HELPERS =================
function getNumericPayload(rows) {
  return rows.map(r => {
    if (Array.isArray(r)) return [Number(r[0] || 0), Number(r[1] || 0)];
    return [Number(r.income || 0), Number(r.spending || 0)];
  });
}

// ================= KMEANS =================
async function runKMeans(state) {
  const res = await fetchClusteringResults({
    data: state.rows,
    k: state.clusterK
  });

  if (res.ok) {
    state.labels = res.result.labels;
    state.centroids = res.result.centroids;
    state.silhouette = res.result.silhouette;
    state.davies = res.result.davies_bouldin;
  }
}

// ================= DBSCAN =================
async function runDbscan(state) {
  const res = await fetchDbscanResults({
    data: getNumericPayload(state.rows),
    eps: state.dbscanEps,
    min_samples: state.dbscanMinSamples,
  });

  if (res.ok) {
    state.dbscanLabels = res.result.labels;
    state.dbscanClusters = res.result.n_clusters;
    state.dbscanNoise = res.result.n_noise;
    state.dbscanSilhouette = res.result.silhouette;
    state.dbscanPseudoCentroids = res.result.pseudo_centroids;

    // unify
    state.labels = res.result.labels;
    state.centroids = res.result.pseudo_centroids;
  }
}

// ================= HIERARCHICAL =================
async function runHierarchicalAlgo(state) {
  const rawData = state.filteredRows || state.rows;

  const inputData = rawData.map(row => {
    if (Array.isArray(row)) return row.map(Number);
    return Object.values(row).filter(v => !isNaN(v)).map(Number);
  });

  const res = await runHierarchical(
    inputData,
    state.clusterK,
    state.linkage || "ward"
  );

  if (res.ok) {
    state.labels = res.result.labels;
    state.silhouette = res.result.silhouette;
    state.davies = res.result.davies_bouldin;
    state.points = res.result.points;
  }
}
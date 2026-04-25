import { defaultDataset } from "../data/mockData.js";
import { applyFilter } from "./datasetController.js";
import { renderMetrics, renderCompareBoards, rerenderMainScatter } from "./chartController.js";
import { resetToSampleData } from "../state/appState.js";
import { readCsvFile } from "../services/fileParser.js";
import { uploadDatasetToBackend, fetchClusteringResults } from "../services/api.js";
import { syncControls, updateClusterLabel, updateAlgorithmButtons } from "./uiController.js";
import { runHierarchical } from "../services/api.js";

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

     if (state.algorithm === "kmeans") {
       await runKMeans(state);
     } else if (state.algorithm === "hierarchical") {
       await runHierarchicalAlgo(state);
     }

      updateClusterLabel(state, els);
  renderMetrics(state, els);
  updateAlgorithmButtons(state);

  await runAllCompare(state);
  rerenderMainScatter(state, els);
  renderCompareBoards(state, els);
    });
  });

  // ===== SELECT =====
  els.algorithmSelect.addEventListener("change", async (e) => {
    state.algorithm = e.target.value;

    if (state.algorithm === "kmeans") {
      await runKMeans(state);
    } else if (state.algorithm === "hierarchical") {
      await runHierarchicalAlgo(state);
    }

    await runAllCompare(state);
  renderMetrics(state, els);
  rerenderMainScatter(state, els);
  renderCompareBoards(state, els);
  });

  // ===== SLIDER K =====
  els.clusterRange.addEventListener("input", async (e) => {
    state.clusterK = Number(e.target.value);

    updateClusterLabel(state, els);

    if (state.algorithm === "kmeans") {
      await runKMeans(state);
    } else if (state.algorithm === "hierarchical") {
      await runHierarchicalAlgo(state);
    }
    await runAllCompare(state);
    rerenderMainScatter(state, els);
    renderMetrics(state, els);
    renderCompareBoards(state, els);
  });

  // ===== FILTER =====
  els.filterSelect.addEventListener("change", async () => {
    state.filteredRows = applyFilter(state);

    if (state.algorithm === "kmeans") {
      await runKMeans(state);
    } else if (state.algorithm === "hierarchical") {
      await runHierarchicalAlgo(state);
    }

    await runAllCompare(state);
    renderCompareBoards(state, els);
    renderMetrics(state, els);
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
        state.filteredRows = state.rows;
        state.points = null;
      } else {
        state.rows = [...defaultDataset];
      }

     if (state.algorithm === "kmeans") {
       await runKMeans(state);
     } else if (state.algorithm === "hierarchical") {
       await runHierarchicalAlgo(state);
     }
      await runAllCompare(state);
      refreshAll();
      return;
    }

    try {
      const rows = await readCsvFile(file);
      state.rows = rows.length ? rows : [...defaultDataset];
    } catch {
      state.rows = [...defaultDataset];
    }

    if (state.algorithm === "kmeans") {
      await runKMeans(state);
    } else if (state.algorithm === "hierarchical") {
      await runHierarchicalAlgo(state);
    }
    await runAllCompare(state);
    refreshAll();
  });
}

// ===== HELPER =====
async function runKMeans(state) {
  const rawData = state.filteredRows || state.rows;
  if (!rawData?.length) return;

  state.points = null;

  const data = rawData.map(row => {
    if (Array.isArray(row)) {
      return row.map(Number).filter(v => !isNaN(v));
    }

    return Object.values(row)
      .map(Number)
      .filter(v => !isNaN(v));
  });

  // bỏ dòng rỗng
  const cleanData = data.filter(row => row.length >= 2);

  if (cleanData.length < 2) return;

  const res = await fetchClusteringResults({
    data: cleanData,
    k: state.clusterK
  });

  if (res.ok) {
    state.labels = res.result.labels;
    state.centroids = res.result.centroids;
    state.silhouette = res.result.silhouette;
    state.davies = undefined;
  }
}
async function runHierarchicalAlgo(state) {
  if (!state.rows?.length) return;

  state.centroids = null;

  const rawData = state.filteredRows || state.rows;

  const inputData = rawData.map(row => {
    if (Array.isArray(row)) return row.map(Number);
    
    return Object.values(row)
      .filter(v => !isNaN(v))
      .map(Number);
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
async function runAllCompare(state) {
  await runKMeansCompare(state);
  await runHierarchicalCompare(state);
}
async function runKMeansCompare(state) {
  const rawData = state.filteredRows || state.rows;
  if (!rawData?.length) return;

  const data = rawData.map(row => {
    if (Array.isArray(row)) {
      return row.map(Number).filter(v => !isNaN(v));
    }

    return Object.values(row)
      .map(Number)
      .filter(v => !isNaN(v));
  });

  const cleanData = data.filter(row => row.length >= 2);

  if (cleanData.length < 2) return;

  const res = await fetchClusteringResults({
    data: cleanData,
    k: state.clusterK
  });

  if (res.ok) {
    state.kmeansLabels = res.result.labels;
    state.kmeansCentroids = res.result.centroids;
  }
}
async function runHierarchicalCompare(state) {
  const rawData = state.filteredRows || state.rows;
  if (!rawData?.length) return;

  const inputData = rawData.map(row => {
    if (Array.isArray(row)) return row.map(Number);

    return Object.values(row)
      .filter(v => !isNaN(v))
      .map(Number);
  });

  const res = await runHierarchical(
    inputData,
    state.clusterK,
    "ward"
  );

  if (res.ok) {
    state.hierarchicalLabels = res.result.labels;
  }
}
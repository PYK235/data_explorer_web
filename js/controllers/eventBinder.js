import { defaultDataset } from "../data/mockData.js";
import { applyFilter } from "./datasetController.js";
import { renderMetrics, renderCompareBoards, rerenderMainScatter } from "./chartController.js";
import { resetToSampleData } from "../state/appState.js";
import { readCsvFile } from "../services/fileParser.js";
import { uploadDatasetToBackend, fetchClusteringResults, fetchDbscanResults } from "../services/api.js";
import { syncControls, updateClusterLabel, updateAlgorithmButtons, showDbscanControls, hideDbscanControls } from "./uiController.js";

export function bindEvents(state, els, refreshAll) {

  // ===== NAV =====
  document.querySelectorAll(".nav-link").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".nav-link").forEach(i => i.classList.remove("active"));
      btn.classList.add("active");
    });
  });

  // ===== DROPDOWN (nguồn chính) =====
  els.algorithmSelect.addEventListener("change", async (e) => {
    state.algorithm = e.target.value;
    updateAlgorithmButtons(state);

    if (state.algorithm === "dbscan") {
      els.clusterRange.closest(".field").style.display = "none";
      showDbscanControls(
        state,
        // callback khi eps thay đổi
        async (val) => {
          state.dbscanEps = val;
          await runDbscan(state);
          rerenderMainScatter(state, els);
          renderMetrics(state, els);
          renderCompareBoards(state, els);
        },
        // callback khi min_samples thay đổi
        async (val) => {
          state.dbscanMinSamples = val;
          await runDbscan(state);
          rerenderMainScatter(state, els);
          renderMetrics(state, els);
          renderCompareBoards(state, els);
        }
      );
      await runDbscan(state);
    } else {
      hideDbscanControls();
      els.clusterRange.closest(".field").style.display = "";
      if (state.algorithm === "kmeans") await runKMeans(state);
    }

    updateClusterLabel(state, els);
    renderMetrics(state, els);
    rerenderMainScatter(state, els);
    renderCompareBoards(state, els);
  });

  // ===== CHIP BUTTONS =====
  document.querySelectorAll(".algo-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      els.algorithmSelect.value = btn.dataset.algoCard;
      els.algorithmSelect.dispatchEvent(new Event("change"));
    });
  });

  // ===== SLIDER K =====
  els.clusterRange.addEventListener("input", async (e) => {
    state.clusterK = Number(e.target.value);
    updateClusterLabel(state, els);
    if (state.algorithm === "kmeans") {
      await runKMeans(state);
      rerenderMainScatter(state, els);
      renderCompareBoards(state, els);
    }
  });

  // ===== SLIDER DENDROGRAM =====
  els.dendrogramRange.addEventListener("input", (e) => {
    state.dendrogramCut = Number(e.target.value);
    els.dendrogramValue.textContent = `${state.dendrogramCut}%`;
    updateClusterLabel(state, els);
  });

  // ===== FILTER =====
  els.filterSelect.addEventListener("change", () => {
    state.filter = els.filterSelect.value;
    applyFilter(state, els);
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
      state.rows = res.ok ? res.data.data : [...defaultDataset];
    } else {
      try {
        const rows = await readCsvFile(file);
        state.rows = rows.length ? rows : [...defaultDataset];
      } catch {
        state.rows = [...defaultDataset];
      }
    }

    if (state.algorithm === "kmeans") await runKMeans(state);
    else if (state.algorithm === "dbscan") await runDbscan(state);

    refreshAll();
  });
}

// =========================
// Helper
// =========================
function getNumericPayload(rows) {
  return rows.map(r => {
    if (Array.isArray(r)) return [Number(r[0] || 0), Number(r[1] || 0)];
    return [Number(r.income || 0), Number(r.spending || 0)];
  });
}

async function runKMeans(state) {
  if (!state.rows?.length) return;
  const res = await fetchClusteringResults({
    data: getNumericPayload(state.rows),
    k: state.clusterK
  });
  if (res.ok) {
    state.labels = res.result.labels;
    state.centroids = res.result.centroids;
    state.silhouette = res.result.silhouette;
  }
}

export async function runDbscan(state) {
  if (!state.rows?.length) return;
  const res = await fetchDbscanResults({
    data: getNumericPayload(state.rows),
    eps: state.dbscanEps,
    min_samples: state.dbscanMinSamples,
  });
  if (res.ok) {
    state.dbscanLabels          = res.result.labels;
    state.dbscanClusters        = res.result.n_clusters;
    state.dbscanNoise           = res.result.n_noise;
    state.dbscanSilhouette      = res.result.silhouette;
    state.dbscanCoreIndices     = res.result.core_indices;
    state.dbscanPseudoCentroids = res.result.pseudo_centroids;
    state.labels                = res.result.labels;
    state.centroids             = res.result.pseudo_centroids;
    state.silhouette            = res.result.silhouette;
  }
}
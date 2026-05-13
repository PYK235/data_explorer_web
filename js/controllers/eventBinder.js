
import { renderOutlierPanel, destroyOutlierPanel } from "../renderers/outlierPanel.js";
import { defaultDataset } from "../data/mockData.js";
import { resetToSampleData } from "../state/appState.js";
import { readCsvFile } from "../services/fileParser.js";
import { predictCustomer, uploadDatasetToBackend } from "../services/api.js";
import { buildPredictMessage } from "../services/clusterInsights.js";
import { syncControls, updateClusterLabel } from "./uiController.js";

export function bindEvents(state, els, refreshAll) {
  document.querySelectorAll(".nav-link").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      const section = document.getElementById(button.dataset.target);
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });

  document.querySelectorAll(".algo-chip").forEach((button) => {
    button.addEventListener("click", async () => {

      const nextAlgo = button.dataset.algoCard;

      // tránh refresh vô ích
      if (state.algorithm === nextAlgo) return;

      state.algorithm = nextAlgo;

      syncControls(state, els);

      await refreshAll();
    });
  });

  els.algorithmSelect.addEventListener("change", async (event) => {

    const nextAlgo = event.target.value;

    // tránh refresh vô ích
    if (state.algorithm === nextAlgo) return;

    state.algorithm = nextAlgo;

    await refreshAll();
  });

  // FIX:
  // input -> change
  // tránh spam refreshAll()
  els.clusterRange.addEventListener("change", async (event) => {

    const nextK = Number(event.target.value);

    // tránh refresh liên tục
    if (state.clusterK === nextK) return;

    state.clusterK = nextK;

    updateClusterLabel(state, els);

    await refreshAll();
  });

  els.dendrogramRange.addEventListener("input", (event) => {
    state.dendrogramCut = Number(event.target.value);
    els.dendrogramValue.textContent = `${state.dendrogramCut}%`;
    updateClusterLabel(state, els);
  });

  els.dendrogramRange.addEventListener("change", async (event) => {
    await refreshAll();
  });

  els.filterSelect.addEventListener("change", async (event) => {
    state.filter = event.target.value;
    await refreshAll();
  });

  els.sampleBtn.addEventListener("click", async () => {
    resetToSampleData();
    syncControls(state, els);
    await refreshAll();
  });

  els.refreshBtn.addEventListener("click", async () => {
    await refreshAll();
  });

  els.fileInput.addEventListener("change", async (event) => {
    const [file] = event.target.files || [];

    if (!file) return;

    state.datasetName = file.name;

    if (file.name.match(/\.(xlsx|xls)$/i)) {

      state.fileStatus = "Đã nhận file Excel, chờ backend/API để đọc sheet";

      state.rows = [...defaultDataset];

      try {
        await uploadDatasetToBackend(file);
      } catch (error) {
        console.error(error);
      }

      await refreshAll();

      return;
    }

    try {

      const rows = await readCsvFile(file);

      state.rows = rows.length
        ? rows
        : [...defaultDataset];

      state.fileStatus = rows.length
        ? "Đọc file CSV thành công"
        : "CSV không hợp lệ, đã quay về dữ liệu mẫu";

    } catch (error) {

      console.error(error);

      state.rows = [...defaultDataset];

      state.fileStatus = "Lỗi đọc file";
    }

    // FIX:
    // bỏ duplicate refreshAll
    await refreshAll();
  });

  // =====================================================
  // FIX PREDICT RELOAD
  // =====================================================
  els.predictForm.addEventListener("submit", async (event) => {

    // FIX:
    // tránh reload page
    event.preventDefault();

    try {

      const income = Number(
        els.predictIncome.value
      );

      const spending = Number(
        els.predictSpending.value
      );

      if (
        isNaN(income) ||
        isNaN(spending)
      ) {

        els.predictResult.innerHTML =
          "Vui lòng nhập dữ liệu hợp lệ";

        return;
      }

      const result = await predictCustomer({
        income,
        spending,
        algorithm: state.algorithm
      });

      state.predictionResult =
        buildPredictMessage(result);

      els.predictResult.innerHTML =
        state.predictionResult;

    } catch (error) {

      console.error(error);

      els.predictResult.innerHTML =
        "Predict thất bại";
    }
  });
}

// ================= UI CONTROL =================
function handleAlgorithmUI(state, els) {
  syncAlgorithmControls(state);

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
  state.points = null;
  state.hierarchicalDendrogram = null;
  state.hierarchicalCutThreshold = null;

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
  state.points = null;
  state.hierarchicalDendrogram = null;
  state.hierarchicalCutThreshold = null;

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
    if (Array.isArray(row))
       return row.map(Number);

    return Object.values(row)
      .filter(v => !isNaN(v))
      .map(Number);
  });

  const res = await runHierarchical(
    inputData,
    state.dendrogramCut,
    state.linkage || "ward",
    state.metric || "euclidean"
  );

  if (res.ok) {
    state.labels = res.result.labels;
    state.silhouette = res.result.silhouette;
    state.davies = res.result.davies_bouldin;
    state.points = res.result.points;
    state.hierarchicalClusters = res.result.n_clusters;
    state.hierarchicalLabels = res.result.labels;
    state.hierarchicalZMatrix = res.result.z_matrix;
    state.hierarchicalDendrogram = res.result.dendrogram;
    state.hierarchicalCutThreshold = res.result.cut_threshold;
    state.hierarchicalEngine = res.result.engine;
  }
}


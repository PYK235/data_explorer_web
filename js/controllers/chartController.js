import { algorithmProfiles } from "../data/mockData.js";
import { renderBars, renderDendrogram, renderScatter } from "../renderers/chartRenderer.js";
import { updateDbscanNoiseCount } from "./uiController.js";

// ================= METRICS + MAIN CHART =================
export function renderMetrics(state, els) {
  const profile = algorithmProfiles[state.algorithm];
  els.scatterTitle.textContent = profile.label;
  els.secondaryChartTitle.textContent = "Biểu đồ cụm";
  els.secondaryChartSubtitle.textContent = "Phân phối điểm";

  // ================= DBSCAN =================
  if (state.algorithm === "dbscan") {
    els.scoreSilhouette.textContent =
      state.dbscanSilhouette !== undefined
        ? Number(state.dbscanSilhouette).toFixed(3)
        : profile.silhouette;

    const n = state.dbscanClusters ?? "—";
    const noise = state.dbscanNoise ?? 0;
    els.scoreClusters.textContent = `${n} + ${noise} noise`;

    renderScatter(
      els.scatterPlot,
      state.filteredRows,
      state.dbscanLabels ?? [],
      "dbscan",
      state.dbscanPseudoCentroids ?? []
    );

    if (state.dbscanLabels?.length) {
      const counts = {};
      let noiseCount = 0;

      state.dbscanLabels.forEach(l => {
        if (l === -1) {
          noiseCount++;
        } else {
          counts[l] = (counts[l] || 0) + 1;
        }
      });

      updateDbscanNoiseCount(noiseCount);

      renderBars(els.barChart, Object.values(counts));
    } else {
      updateDbscanNoiseCount(0);
      renderBars(els.barChart, profile.bars);
    }

    return;
  }

  // ================= HIERARCHICAL =================
  if (state.algorithm === "hierarchical") {
    els.secondaryChartTitle.textContent = "Dendrogram";
    els.secondaryChartSubtitle.textContent = `${state.linkage} + ${state.metric}`;

    els.scoreSilhouette.textContent =
      state.silhouette !== undefined
        ? Number(state.silhouette).toFixed(3)
        : profile.silhouette;

    els.scoreClusters.textContent =
      state.hierarchicalClusters ?? profile.clusters;

    els.scoreDavies.textContent =
      state.davies !== undefined
        ? Number(state.davies).toFixed(3)
        : "-";

    const data = state.points || state.filteredRows;

    renderScatter(
      els.scatterPlot,
      data,
      state.labels ?? [],
      "hierarchical"
    );

    renderDendrogram(els.barChart, state.hierarchicalDendrogram, state.hierarchicalCutThreshold);

    return;
  }

  // ================= KMEANS =================
  els.scoreSilhouette.textContent =
    state.silhouette !== undefined
      ? Number(state.silhouette).toFixed(3)
      : profile.silhouette;

  els.scoreClusters.textContent = String(state.clusterK);

  els.scoreDavies.textContent =
    state.davies !== undefined
      ? Number(state.davies).toFixed(3)
      : "-";

  const data = state.points || state.filteredRows;

  renderScatter(
    els.scatterPlot,
    data,
    state.labels ?? [],
    "kmeans",
    state.centroids ?? []
  );

  if (state.labels?.length) {
    const counts = {};
    state.labels.forEach(l => {
      counts[l] = (counts[l] || 0) + 1;
    });
    renderBars(els.barChart, Object.values(counts));
  } else {
    renderBars(els.barChart, profile.bars);
  }
}

// ================= COMPARE BOARDS =================
export function renderCompareBoards(state, els) {
  const data = state.filteredRows || state.rows;

  renderScatter(
    els.compareKmeans,
    data,
    state.kmeansLabels ?? [],
    "kmeans",
    state.kmeansCentroids ?? []
  );

  renderScatter(
    els.compareDbscan,
    data,
    state.dbscanLabels ?? [],
    "dbscan"
  );

  renderScatter(
    els.compareHierarchical,
    data,
    state.hierarchicalLabels ?? [],
    "hierarchical"
  );
}

// ================= RERENDER MAIN =================
export function rerenderMainScatter(state, els) {
  const data = state.points || state.filteredRows;

  let labels = state.labels;
  let centroids = state.centroids;

  if (state.algorithm === "dbscan") {
    labels = state.dbscanLabels;
    centroids = state.dbscanPseudoCentroids;
  }

  renderScatter(
    els.scatterPlot,
    data,
    labels ?? [],
    state.algorithm,
    centroids ?? []
  );
}

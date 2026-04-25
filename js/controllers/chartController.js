import { algorithmProfiles } from "../data/mockData.js";
import { renderBars, renderScatter } from "../renderers/chartRenderer.js";

// ================= METRICS + MAIN CHART =================
export function renderMetrics(state, els) {
  const profile = algorithmProfiles[state.algorithm];

  els.scatterTitle.textContent = profile.label;

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
      state.dbscanLabels.forEach(l => {
        if (l !== -1) counts[l] = (counts[l] || 0) + 1;
      });
      renderBars(els.barChart, Object.values(counts));
    } else {
      renderBars(els.barChart, profile.bars);
    }

  } else {
    els.scoreSilhouette.textContent =
      state.silhouette !== undefined
        ? Number(state.silhouette).toFixed(3)
        : profile.silhouette;

    els.scoreClusters.textContent = state.algorithm === "kmeans"
      ? String(state.clusterK)
      : profile.clusters;

    renderScatter(
      els.scatterPlot,
      state.filteredRows,
      state.labels,
      state.algorithm,
      state.centroids
    );

    if (state.labels?.length) {
      const counts = {};
      state.labels.forEach(l => { counts[l] = (counts[l] || 0) + 1; });
      renderBars(els.barChart, Object.values(counts));
    } else {
      renderBars(els.barChart, profile.bars);
    }
  }
}

// ================= COMPARE BOARDS =================
export function renderCompareBoards(state, els) {
  renderScatter(
    els.compareKmeans,
    state.filteredRows,
    state.algorithm === "kmeans" ? state.labels : [],
    "kmeans",
    state.algorithm === "kmeans" ? state.centroids : []
  );

  renderScatter(
    els.compareDbscan,
    state.filteredRows,
    state.algorithm === "dbscan" ? state.dbscanLabels : [],
    "dbscan"
  );

  renderScatter(
    els.compareHierarchical,
    state.filteredRows,
    state.algorithm === "hierarchical" ? state.labels : [],
    "hierarchical"
  );
}

// ================= RERENDER MAIN =================
export function rerenderMainScatter(state, els) {
  const labels = state.algorithm === "dbscan" ? state.dbscanLabels : state.labels;
  const centroids = state.algorithm === "dbscan"
    ? (state.dbscanPseudoCentroids ?? [])
    : (state.centroids ?? []);

  renderScatter(
    els.scatterPlot,
    state.filteredRows,
    labels ?? [],
    state.algorithm,
    centroids
  );
}
import { algorithmProfiles } from "../data/mockData.js";
import { renderBars, renderScatter } from "../renderers/chartRenderer.js";

// ================= METRICS + MAIN CHART =================
export function renderMetrics(state, els) {
  const profile = algorithmProfiles[state.algorithm];

  // ===== TEXT =====
  els.scatterTitle.textContent = profile.label;

  // 👉 silhouette thật nếu có, không thì fallback
  els.scoreSilhouette.textContent =
    state.silhouette !== undefined
      ? Number(state.silhouette).toFixed(3)
      : profile.silhouette;

  // 👉 số cụm
  els.scoreClusters.textContent = state.clusterK;

  // ===== SCATTER =====
  renderScatter(
    els.scatterPlot,
    state.filteredRows,
    state.labels,
    state.algorithm,
    state.centroids
  );

  // ===== BAR CHART (REAL DATA) =====
  if (state.labels && state.labels.length) {
    const counts = {};

    state.labels.forEach((l) => {
      counts[l] = (counts[l] || 0) + 1;
    });

    renderBars(els.barChart, Object.values(counts));
  } else {
    // fallback khi chưa chạy KMeans
    renderBars(els.barChart, profile.bars);
  }
}

// ================= COMPARE BOARDS =================
export function renderCompareBoards(state, els) {
  renderScatter(
    els.compareKmeans,
    state.filteredRows,
    state.labels,
    "kmeans",
    state.centroids
  );

  renderScatter(
    els.compareDbscan,
    state.filteredRows,
    state.labels,
    "dbscan"
  );

  renderScatter(
    els.compareHierarchical,
    state.filteredRows,
    state.labels,
    "hierarchical"
  );
}

// ================= RERENDER MAIN =================
export function rerenderMainScatter(state, els) {
  renderScatter(
    els.scatterPlot,
    state.filteredRows,
    state.labels,
    state.algorithm,
    state.centroids
  );
}
import { algorithmProfiles } from "../data/mockData.js";
import { buildClusterNameMap, buildDashboardStats, attachClusterInsights } from "../services/clusterInsights.js";
import { fetchClusteringResults } from "../services/api.js";
import { renderBars, renderClusterNameList, renderDashboardStats, renderScatter } from "../renderers/chartRenderer.js";

function getClusterCountText(rows, algorithm) {
  const labels = new Set(rows.map((row) => row.clusterLabel));
  const hasNoise = labels.has(-1);
  const cleanCount = [...labels].filter((label) => label !== -1).length;

  if (algorithm === "dbscan" && hasNoise) {
    return `${cleanCount} + noise`;
  }

  return String(cleanCount);
}

function getFallbackMetrics(algorithm) {
  const profile = algorithmProfiles[algorithm];
  return {
    silhouette: profile.silhouette,
    davies: profile.davies
  };
}

export async function renderMetrics(state, els) {
  const profile = algorithmProfiles[state.algorithm];
  const fallbackRows = attachClusterInsights(state.filteredRows, state.algorithm);
  const apiResult = await fetchClusteringResults({
    algorithm: state.algorithm,
    rows: state.filteredRows,
    clusterK: state.clusterK,
    dendrogramCut: state.dendrogramCut
  });

  const clusteredRows = apiResult.clusteredRows ?? fallbackRows;
  const stats = apiResult.stats ?? buildDashboardStats(clusteredRows);
  const clusterMap = apiResult.clusterMap ?? buildClusterNameMap(clusteredRows);
  const fallbackMetrics = getFallbackMetrics(state.algorithm);

  state.clusteredRows = clusteredRows;
  state.lastClusterResultSource = apiResult.source;

  els.scoreSilhouette.textContent = apiResult.silhouette ?? fallbackMetrics.silhouette;
  els.scoreDavies.textContent = apiResult.davies ?? fallbackMetrics.davies;
  els.scoreClusters.textContent = getClusterCountText(clusteredRows, state.algorithm);
  els.scatterTitle.textContent = `${profile.label}${apiResult.source === "api" ? "" : " (demo)"}`;

  renderScatter(els.scatterPlot, clusteredRows, els.scatterTooltip);
  renderBars(els.barChart, stats);
  renderClusterNameList(els.clusterNameList, clusterMap);
  renderDashboardStats(els.dashboardStats, stats);
}

export function renderCompareBoards(state, els) {
  renderScatter(els.compareKmeans, attachClusterInsights(state.filteredRows, "kmeans"));
  renderScatter(els.compareDbscan, attachClusterInsights(state.filteredRows, "dbscan"));
  renderScatter(els.compareHierarchical, attachClusterInsights(state.filteredRows, "hierarchical"));
}

export function rerenderMainScatter(state, els) {
  renderScatter(els.scatterPlot, state.clusteredRows, els.scatterTooltip);
}

export function updateAlgorithmButtons(state) {
  document.querySelectorAll(".algo-chip").forEach((button) => {
    button.classList.toggle("selected", button.dataset.algoCard === state.algorithm);
  });
}

export function syncControls(state, els) {
  els.algorithmSelect.value = state.algorithm;
  els.clusterValue.textContent = String(state.clusterK);
  els.dendrogramValue.textContent = `${state.dendrogramCut}%`;
  els.filterSelect.value = state.filter;

  // Show/hide controls based on algorithm
  const clusterField = els.clusterRange.closest('.field');
  const dendrogramField = els.dendrogramRange.closest('.field');

  if (clusterField) {
    clusterField.style.display = state.algorithm === 'kmeans' ? 'block' : 'none';
  }
  if (dendrogramField) {
    dendrogramField.style.display = state.algorithm === 'hierarchical' ? 'block' : 'none';
  }
}

export function updateClusterLabel(state, els) {
  els.clusterValue.textContent = String(state.clusterK);

  if (state.algorithm === "hierarchical") {
    const clusterEstimate = Math.max(2, Math.round(state.dendrogramCut / 20));
    els.scoreClusters.textContent = String(clusterEstimate);
    return;
  }

  if (state.algorithm === "dbscan") {
    els.scoreClusters.textContent = "4 + noise";
    return;
  }

  els.scoreClusters.textContent = String(state.clusterK);
}

import { algorithmProfiles } from "../data/mockData.js";

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
}

export function updateClusterLabel(state, els) {
  els.clusterValue.textContent = String(state.clusterK);

  if (state.algorithm === "kmeans") {
    els.scoreClusters.textContent = String(state.clusterK);
  } else if (state.algorithm === "dbscan") {
    const n = state.dbscanClusters ?? "—";
    const noise = state.dbscanNoise ?? 0;
    els.scoreClusters.textContent = `${n} + ${noise} noise`;
  } else if (state.algorithm === "hierarchical") {
    const clusterEstimate = Math.max(2, Math.round(state.dendrogramCut / 20));
    els.scoreClusters.textContent = String(clusterEstimate);
  } else {
    els.scoreClusters.textContent = algorithmProfiles[state.algorithm]?.clusters ?? "—";
  }
}

// =========================
// DBSCAN controls
// =========================
const DBSCAN_BLOCK_ID = "dbscanControls";

export function showDbscanControls(state, onEpsChange, onMinSamplesChange) {
  // Ẩn dendrogram slider khi dùng DBSCAN
  const dendrogramField = document.getElementById("dendrogramRange")?.closest(".field");
  if (dendrogramField) dendrogramField.style.display = "none";

  if (document.getElementById(DBSCAN_BLOCK_ID)) return;

  const controlStack = document.querySelector(".control-stack");
  if (!controlStack) return;

  const block = document.createElement("div");
  block.id = DBSCAN_BLOCK_ID;
  block.innerHTML = `
    <div class="field">
      <div class="field-row">
        <label for="dbscanEpsRange">Epsilon (eps)</label>
        <strong id="dbscanEpsValue">${(state?.dbscanEps ?? 0.5).toFixed(2)}</strong>
      </div>
      <input id="dbscanEpsRange" type="range" min="0.1" max="3" step="0.05" value="${state?.dbscanEps ?? 0.5}">
      <p class="muted" style="margin:4px 0 0;font-size:0.8rem;">
        Bán kính vùng lân cận. Thấp → nhiều noise. Cao → ít cụm.
      </p>
    </div>
    <div class="field">
      <div class="field-row">
        <label for="dbscanMinSamplesRange">Min Samples</label>
        <strong id="dbscanMinSamplesValue">${state?.dbscanMinSamples ?? 5}</strong>
      </div>
      <input id="dbscanMinSamplesRange" type="range" min="2" max="20" step="1" value="${state?.dbscanMinSamples ?? 5}">
      <p class="muted" style="margin:4px 0 0;font-size:0.8rem;">
        Số điểm tối thiểu để tạo điểm lõi. Tăng → cụm chặt hơn.
      </p>
    </div>
    <div class="metric-card" id="dbscanNoiseInfo" style="padding:12px 14px;">
      <span>Noise Points</span>
      <strong id="dbscanNoiseCount">—</strong>
    </div>
  `;

  controlStack.appendChild(block);

  // Gắn event listeners ngay sau khi inject
  const epsRange = document.getElementById("dbscanEpsRange");
  const epsValue = document.getElementById("dbscanEpsValue");
  epsRange.addEventListener("input", () => {
    const val = parseFloat(epsRange.value);
    epsValue.textContent = val.toFixed(2);
    if (state) state.dbscanEps = val;
    if (onEpsChange) onEpsChange(val);
  });

  const minR = document.getElementById("dbscanMinSamplesRange");
  const minV = document.getElementById("dbscanMinSamplesValue");
  minR.addEventListener("input", () => {
    const val = parseInt(minR.value, 10);
    minV.textContent = val;
    if (state) state.dbscanMinSamples = val;
    if (onMinSamplesChange) onMinSamplesChange(val);
  });
}

export function hideDbscanControls() {
  // Hiện lại dendrogram slider
  const dendrogramField = document.getElementById("dendrogramRange")?.closest(".field");
  if (dendrogramField) dendrogramField.style.display = "";

  document.getElementById(DBSCAN_BLOCK_ID)?.remove();
}

export function updateDbscanNoiseCount(n) {
  const el = document.getElementById("dbscanNoiseCount");
  if (el) el.textContent = n !== null && n !== undefined ? String(n) : "—";
}
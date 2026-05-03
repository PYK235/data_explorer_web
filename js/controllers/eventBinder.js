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
      state.algorithm = button.dataset.algoCard;
      syncControls(state, els);
      await refreshAll();
    });
  });

  els.algorithmSelect.addEventListener("change", async (event) => {
    state.algorithm = event.target.value;
    await refreshAll();
  });

  els.clusterRange.addEventListener("input", async (event) => {
    state.clusterK = Number(event.target.value);
    updateClusterLabel(state, els);
    await refreshAll();
  });

  els.dendrogramRange.addEventListener("input", (event) => {
    state.dendrogramCut = Number(event.target.value);
    els.dendrogramValue.textContent = `${state.dendrogramCut}%`;
    updateClusterLabel(state, els);
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
      await uploadDatasetToBackend(file);
      await refreshAll();
      return;
    }

    try {
      const rows = await readCsvFile(file);
      state.rows = rows.length ? rows : [...defaultDataset];
      state.fileStatus = rows.length ? "Đọc file CSV thành công" : "CSV không hợp lệ, đã quay về dữ liệu mẫu";
      await refreshAll();
    } catch (error) {
      state.rows = [...defaultDataset];
      state.fileStatus = "Không đọc được CSV, đã quay về dữ liệu mẫu";
      await refreshAll();
    }
  });

  els.predictForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const income = Number(els.predictIncome.value);
    const spending = Number(els.predictSpending.value);

    if (Number.isNaN(income) || Number.isNaN(spending)) {
      els.predictResult.innerHTML = "Vui lòng nhập đầy đủ income và spending.";
      return;
    }

    const prediction = await predictCustomer({
      income,
      spending,
      algorithm: state.algorithm
    });

    state.predictionResult = `
      ${buildPredictMessage(prediction)}
      <strong>${prediction.reason}</strong>
    `;
    els.predictResult.innerHTML = state.predictionResult;
  });
}

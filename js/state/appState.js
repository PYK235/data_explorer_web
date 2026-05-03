import { defaultDataset } from "../data/mockData.js";

export const state = {
  datasetName: "Mall Customers.csv",
  fileStatus: "Đã nạp dữ liệu mẫu",
  rows: [...defaultDataset],
  filteredRows: [...defaultDataset],
  clusteredRows: [...defaultDataset],
  algorithm: "kmeans",
  clusterK: 4,
  dendrogramCut: 65,
  filter: "all",
  predictionResult: "Khách này thuộc nhóm: VIP",
  lastClusterResultSource: "fallback"
};

export function resetToSampleData() {
  state.datasetName = "Mall Customers.csv";
  state.fileStatus = "Đã nạp dữ liệu mẫu";
  state.rows = [...defaultDataset];
  state.filteredRows = [...defaultDataset];
  state.clusteredRows = [...defaultDataset];
  state.filter = "all";
  state.predictionResult = "Khách này thuộc nhóm: VIP";
  state.lastClusterResultSource = "fallback";
}

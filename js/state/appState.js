import { defaultDataset } from "../data/mockData.js";

export const state = {
  datasetName: "Mall Customers.csv",
  fileStatus: "Da nap du lieu mau",
  rows: [...defaultDataset],
  filteredRows: [...defaultDataset],
  algorithm: "kmeans",
  clusterK: 4,
  dendrogramCut: 65,
  filter: "all"
};

export function resetToSampleData() {
  state.datasetName = "Mall Customers.csv";
  state.fileStatus = "Da nap du lieu mau";
  state.rows = [...defaultDataset];
  state.filteredRows = [...defaultDataset];
  state.filter = "all";
}

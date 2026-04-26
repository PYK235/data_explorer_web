import { defaultDataset } from "../data/mockData.js";

export const state = {
  datasetName: "Mall Customers.csv",
  fileStatus: "Da nap du lieu mau",
  rows: [...defaultDataset],
  filteredRows: [...defaultDataset],
  algorithm: "kmeans",
  clusterK: 4,
  dendrogramCut: 65,
  linkage: "ward",
  metric: "euclidean",
  filter: "all",

  // KMeans results
  labels: null,
  centroids: null,
  silhouette: undefined,
  davies: undefined,
  points: null,
  hierarchicalClusters: null,
  hierarchicalLabels: null,
  hierarchicalZMatrix: null,
  hierarchicalDendrogram: null,
  hierarchicalCutThreshold: null,
  hierarchicalEngine: null,

  // DBSCAN params & results
  dbscanEps: 0.5,
  dbscanMinSamples: 5,
  dbscanLabels: null,
  dbscanClusters: null,
  dbscanNoise: null,
  dbscanSilhouette: undefined,
  dbscanCoreIndices: null,
  dbscanPseudoCentroids: null,
};

export function resetToSampleData() {
  state.datasetName = "Mall Customers.csv";
  state.fileStatus = "Da nap du lieu mau";
  state.rows = [...defaultDataset];
  state.filteredRows = [...defaultDataset];
  state.filter = "all";
  state.labels = null;
  state.centroids = null;
  state.silhouette = undefined;
  state.davies = undefined;
  state.points = null;
  state.hierarchicalClusters = null;
  state.hierarchicalLabels = null;
  state.hierarchicalZMatrix = null;
  state.hierarchicalDendrogram = null;
  state.hierarchicalCutThreshold = null;
  state.hierarchicalEngine = null;
  state.dbscanLabels = null;
  state.dbscanClusters = null;
  state.dbscanNoise = null;
  state.dbscanSilhouette = undefined;
}

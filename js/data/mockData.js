export const defaultDataset = [
  { id: 1, gender: "Female", age: 21, income: 15, spending: 39, segment: "Budget" },
  { id: 2, gender: "Female", age: 24, income: 16, spending: 81, segment: "Impulse" },
  { id: 3, gender: "Male", age: 29, income: 25, spending: 6, segment: "Saver" },
  { id: 4, gender: "Male", age: 32, income: 28, spending: 77, segment: "Explorer" },
  { id: 5, gender: "Female", age: 35, income: 33, spending: 40, segment: "Balanced" },
  { id: 6, gender: "Female", age: 38, income: 39, spending: 76, segment: "Impulse" },
  { id: 7, gender: "Male", age: 41, income: 45, spending: 35, segment: "Balanced" },
  { id: 8, gender: "Male", age: 43, income: 49, spending: 14, segment: "Saver" },
  { id: 9, gender: "Female", age: 47, income: 54, spending: 52, segment: "Balanced" },
  { id: 10, gender: "Female", age: 50, income: 60, spending: 61, segment: "Premium" },
  { id: 11, gender: "Male", age: 53, income: 69, spending: 23, segment: "Premium" },
  { id: 12, gender: "Female", age: 57, income: 78, spending: 89, segment: "VIP" }
];

export const algorithmProfiles = {
  kmeans: {
    label: "K-Means",
    silhouette: "0.71",
    davies: "0.42",
    clusters: "4",
    bars: [18, 22, 16, 24],
    scatterVariant: "kmeans"
  },
  dbscan: {
    label: "DBSCAN",
    silhouette: "0.63",
    davies: "0.58",
    clusters: "3 + noise",
    bars: [28, 19, 21, 8],
    scatterVariant: "dbscan"
  },
  hierarchical: {
    label: "Hierarchical",
    silhouette: "0.68",
    davies: "0.47",
    clusters: "5",
    bars: [12, 18, 14, 20, 16],
    scatterVariant: "hierarchical"
  }
};

export const chartColors = ["#60a5fa", "#2dd4bf", "#fbbf24", "#fb7185", "#a78bfa", "#34d399"];

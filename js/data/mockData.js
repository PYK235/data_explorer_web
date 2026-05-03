export const defaultDataset = [
  { id: 101, customer: "#101", gender: "Female", age: 21, income: 15, spending: 39 },
  { id: 102, customer: "#102", gender: "Female", age: 24, income: 16, spending: 81 },
  { id: 103, customer: "#103", gender: "Male", age: 29, income: 25, spending: 6 },
  { id: 104, customer: "#104", gender: "Male", age: 32, income: 28, spending: 77 },
  { id: 105, customer: "#105", gender: "Female", age: 35, income: 33, spending: 40 },
  { id: 106, customer: "#106", gender: "Female", age: 38, income: 39, spending: 76 },
  { id: 107, customer: "#107", gender: "Male", age: 41, income: 45, spending: 35 },
  { id: 108, customer: "#108", gender: "Male", age: 43, income: 49, spending: 14 },
  { id: 109, customer: "#109", gender: "Female", age: 47, income: 54, spending: 52 },
  { id: 110, customer: "#110", gender: "Female", age: 50, income: 60, spending: 61 },
  { id: 111, customer: "#111", gender: "Male", age: 53, income: 69, spending: 23 },
  { id: 112, customer: "#112", gender: "Female", age: 57, income: 78, spending: 89 }
];

export const algorithmProfiles = {
  kmeans: {
    label: "K-Means",
    silhouette: "0.71",
    davies: "0.42"
  },
  dbscan: {
    label: "DBSCAN",
    silhouette: "0.63",
    davies: "0.58"
  },
  hierarchical: {
    label: "Hierarchical",
    silhouette: "0.68",
    davies: "0.47"
  }
};

export const chartColors = {
  VIP: "#60a5fa",
  "Tiềm năng": "#2dd4bf",
  "Bình thường": "#fbbf24",
  "Tiết kiệm": "#a78bfa",
  "Bất thường": "#fb7185"
};

export const customerGroupOrder = [
  "VIP",
  "Tiềm năng",
  "Bình thường",
  "Tiết kiệm",
  "Bất thường"
];

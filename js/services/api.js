const BASE = "http://127.0.0.1:5000";

// ============================
// Upload dataset
// ============================
export async function uploadDatasetToBackend(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${BASE}/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    return { ok: true, data };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

// ============================
// KMeans
// ============================
export async function fetchClusteringResults(payload) {
  try {
    const res = await fetch(`${BASE}/kmeans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: payload.data, k: payload.k }),
    });

    const result = await res.json();
    return { ok: true, result };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

// ============================
// DBSCAN
// ============================
export async function fetchDbscanResults(payload) {
  try {
    const res = await fetch(`${BASE}/dbscan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: payload.data,
        eps: payload.eps,
        min_samples: payload.min_samples,
      }),
    });

    if (!res.ok) throw new Error("Server error");
    const result = await res.json();
    return { ok: true, result };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

// ============================
// DBSCAN — gợi ý eps tối ưu
// ============================
export async function fetchDbscanSuggestEps(payload) {
  try {
    const res = await fetch(`${BASE}/dbscan/suggest-eps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        data: payload.data,
        min_samples: payload.min_samples,
      }),
    });

    const result = await res.json();
    return { ok: true, result };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}
export async function runHierarchical(data, k, linkage = "ward") {
  try {
    const res = await fetch("http://127.0.0.1:5000/hierarchical", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        data,
        n_clusters: k,
        linkage
      })
    });

    if (!res.ok) throw new Error("Server error");
    const result = await res.json();

    console.log("Hierarchical:", result);

    return {
      ok: true,
      result
    };
  } catch (err) {
    console.error("Hierarchical error:", err);
    return { 
      ok: false,
      message: err.message
   };
  }
}
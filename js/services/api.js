// Diem moc de ket noi backend sau nay.
// Co the doi thanh fetch("/api/...") khi ghep voi Flask/FastAPI.
// ============================
// Upload dataset
// ============================
export async function uploadDatasetToBackend(file) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://127.0.0.1:5000/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    return {
      ok: true,
      data,
    };
  } catch (err) {
    return {
      ok: false,
      message: err.message,
    };
  }
}

// ============================
// Clustering (KMeans)
// ============================
export async function fetchClusteringResults(payload) {
  try {
    const res = await fetch("http://127.0.0.1:5000/kmeans", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: payload.data,
        k: payload.k,
      }),
    });

    const result = await res.json();

    return {
      ok: true,
      result,
    };
  } catch (err) {
    return {
      ok: false,
      message: err.message,
    };
  }
}
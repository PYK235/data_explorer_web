import {
  attachClusterInsights,
  buildClusterNameMap,
  buildDashboardStats,
  inferCustomerGroup
} from "./clusterInsights.js";

function getApiBaseUrl() {
  const params = new URLSearchParams(window.location.search);
  const queryBase = params.get("apiBase");
  const localBase = window.localStorage.getItem("smart-data-explorer-api-base");
  return queryBase || localBase || "http://127.0.0.1:8000";
}

function buildHeaders() {
  return {
    "Content-Type": "application/json"
  };
}

async function postJson(path, payload) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`API ${path} failed with status ${response.status}`);
  }

  return response.json();
}

function getValue(source, keys, fallback = null) {
  for (const key of keys) {
    if (source && source[key] !== undefined && source[key] !== null) {
      return source[key];
    }
  }
  return fallback;
}

function getAlgorithmPath(algorithm) {
  switch (algorithm) {
    case "dbscan":
      return "/dbscan";
    case "hierarchical":
      return "/hierarchical";
    default:
      return "/kmeans";
  }
}

function buildRequestPayload(payload) {
  return {
    data: payload.rows.map((row) => ({
      id: row.id,
      customer: row.customer,
      income: Number(row.income),
      spending: Number(row.spending),
      age: Number(row.age),
      gender: row.gender
    })),
    k: payload.clusterK,
    eps: payload.eps ?? 12,
    min_samples: payload.minSamples ?? 3,
    linkage: payload.linkage ?? "ward",
    dendrogram_cut: payload.dendrogramCut
  };
}

function enrichRowsFromApi(rows, response, algorithm) {
  const labels = getValue(response, ["labels", "cluster_labels"], []);
  const names =
    getValue(response, ["cluster_names", "clusterNames", "cluster_name_map"], {}) || {};

  return rows.map((row, index) => {
    const fallback = inferCustomerGroup(row.income, row.spending, algorithm);
    const label = labels[index] ?? fallback.label;
    const clusterName =
      names[label] ??
      names[String(label)] ??
      row.clusterName ??
      fallback.name;

    const resolved = inferCustomerGroup(row.income, row.spending, algorithm === "dbscan" && label === -1 ? "dbscan" : algorithm);

    return {
      ...row,
      clusterLabel: label,
      clusterName,
      clusterColor: resolved.color,
      clusterReason: resolved.reason
    };
  });
}

function buildFallbackResponse(payload) {
  const clusteredRows = attachClusterInsights(payload.rows, payload.algorithm);
  return {
    ok: false,
    source: "fallback",
    message: "Không kết nối được backend, đang dùng dữ liệu demo phía frontend.",
    clusteredRows,
    stats: buildDashboardStats(clusteredRows),
    clusterMap: buildClusterNameMap(clusteredRows),
    silhouette: payload.algorithm === "dbscan" ? "0.63" : payload.algorithm === "hierarchical" ? "0.68" : "0.71",
    davies: payload.algorithm === "dbscan" ? "0.58" : payload.algorithm === "hierarchical" ? "0.47" : "0.42"
  };
}

export async function uploadDatasetToBackend(file) {
  return {
    ok: false,
    message: `Chưa kết nối backend để xử lý file ${file.name}`
  };
}

export async function fetchClusteringResults(payload) {
  try {
    const requestPayload = buildRequestPayload(payload);
    const response = await postJson(getAlgorithmPath(payload.algorithm), requestPayload);
    const clusteredRows = enrichRowsFromApi(payload.rows, response, payload.algorithm);

    return {
      ok: true,
      source: "api",
      clusteredRows,
      stats:
        getValue(response, ["stats", "dashboard_stats"], null) ??
        buildDashboardStats(clusteredRows),
      clusterMap:
        getValue(response, ["clusterMap", "cluster_map"], null) ??
        buildClusterNameMap(clusteredRows),
      silhouette: String(getValue(response, ["silhouette_score", "silhouette"], payload.algorithm === "dbscan" ? "0.63" : "0.71")),
      davies: String(getValue(response, ["davies_bouldin", "daviesBouldin", "davies"], payload.algorithm === "dbscan" ? "0.58" : "0.42"))
    };
  } catch (error) {
    return buildFallbackResponse(payload);
  }
}

export async function predictCustomer(payload) {
  try {
    const response = await postJson("/predict", {
      income: Number(payload.income),
      spending: Number(payload.spending)
    });

    const clusterName = getValue(response, ["clusterName", "cluster_name", "prediction", "label"], "Bình thường");
    const fallback = inferCustomerGroup(payload.income, payload.spending, payload.algorithm);

    return {
      ok: true,
      source: "api",
      clusterName,
      clusterLabel: getValue(response, ["clusterLabel", "cluster_label"], fallback.label),
      reason: getValue(response, ["reason", "insight"], fallback.reason)
    };
  } catch (error) {
    const cluster = inferCustomerGroup(payload.income, payload.spending, payload.algorithm);
    return {
      ok: false,
      source: "fallback",
      clusterName: cluster.name,
      clusterLabel: cluster.label,
      reason: cluster.reason
    };
  }
}

from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np

from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN, KMeans
from sklearn.metrics import silhouette_score

dbscan_bp = Blueprint("dbscan_bp", __name__)


def _read_file(file_storage):
    filename = (file_storage.filename or "").lower()
    if filename.endswith(".csv"):
        df = pd.read_csv(file_storage)
    elif filename.endswith((".xlsx", ".xls")):
        df = pd.read_excel(file_storage)
    else:
        raise ValueError("Định dạng file không hỗ trợ")
    if df is None or df.empty:
        raise ValueError("File rỗng")
    return df


def _select_numeric(df):
    X = df.select_dtypes(include=[np.number])
    if X.shape[1] < 2:
        raise ValueError("Cần ít nhất 2 cột số")
    X = X.dropna()
    if X.shape[0] < 2:
        raise ValueError("Không đủ dữ liệu sau khi loại NaN")
    return X


@dbscan_bp.route("/upload", methods=["POST"])
def upload():
    file = request.files.get("file")
    if not file:
        return jsonify({"error": "No file uploaded"}), 400
    try:
        df = _read_file(file)
        X = _select_numeric(df)
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        return jsonify({
            "data": X_scaled.tolist(),
            "columns": X.columns.tolist(),
            "n_rows": int(X.shape[0]),
            "n_cols": int(X.shape[1])
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 400


# @dbscan_bp.route("/kmeans", methods=["POST"])
# def kmeans():
#     body = request.get_json(silent=True) or {}
#     data = body.get("data")
#     k = int(body.get("k", 3))
#     if not data:
#         return jsonify({"error": "No data"}), 400

#     X = np.array(data)
#     if X.ndim != 2 or X.shape[0] < 2:
#         return jsonify({"error": "Data không hợp lệ"}), 400

#     scaler = StandardScaler()
#     X_scaled = scaler.fit_transform(X)
#     k = max(2, min(k, X.shape[0]))
#     try:
#         model = KMeans(n_clusters=k, random_state=42, n_init=10)
#         labels = model.fit_predict(X_scaled)
#         centroids_scaled = model.cluster_centers_
#         centroids = scaler.inverse_transform(centroids_scaled)
#         try:
#             score = float(silhouette_score(X_scaled, labels))
#         except Exception:
#             score = 0.0
#         unique, counts = np.unique(labels, return_counts=True)
#         cluster_counts = dict(zip(unique.astype(int).tolist(), counts.astype(int).tolist()))
#         return jsonify({
#             "labels": labels.tolist(),
#             "centroids": centroids.tolist(),
#             "silhouette": score,
#             "n_clusters": int(k),
#             "cluster_counts": cluster_counts
#         })
#     except Exception as e:
#         return jsonify({"error": str(e)}), 500


@dbscan_bp.route("/elbow", methods=["POST"])
def elbow():
    body = request.get_json(silent=True) or {}
    data = body.get("data")
    if not data:
        return jsonify({"error": "No data"}), 400
    X = np.array(data)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    try:
        max_k = min(10, X.shape[0])
        Ks = list(range(1, max_k + 1))
        inertia = []
        for k in Ks:
            model = KMeans(n_clusters=k, random_state=42, n_init=10)
            model.fit(X_scaled)
            inertia.append(float(model.inertia_))
        return jsonify({"k": Ks, "inertia": inertia})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@dbscan_bp.route("/dbscan", methods=["POST"])
def dbscan():
    body = request.get_json(silent=True) or {}
    data = body.get("data")
    eps = float(body.get("eps", 0.5))
    min_samples = int(body.get("min_samples", 5))

    print(f"DBSCAN eps={eps}, min_samples={min_samples}")

    if not data:
        return jsonify({"error": "No data"}), 400

    X = np.array(data)
    if X.ndim != 2 or X.shape[0] < 2:
        return jsonify({"error": "Data không hợp lệ"}), 400

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    eps = max(0.01, min(eps, 10.0))
    min_samples = max(2, min(min_samples, X.shape[0] // 2))

    try:
        model = DBSCAN(eps=eps, min_samples=min_samples)
        labels = model.fit_predict(X_scaled)
        unique_labels = set(labels)
        n_clusters = len(unique_labels - {-1})
        n_noise = int(np.sum(labels == -1))

        try:
            if n_clusters >= 2 and n_noise < len(labels):
                mask = labels != -1
                score = float(silhouette_score(X_scaled[mask], labels[mask]))
            else:
                score = 0.0
        except Exception:
            score = 0.0

        unique, counts = np.unique(labels, return_counts=True)
        cluster_counts = dict(zip(unique.astype(int).tolist(), counts.astype(int).tolist()))
        pseudo_centroids = []
        for lbl in sorted(unique_labels - {-1}):
            pts = X[labels == lbl]
            pseudo_centroids.append(pts.mean(axis=0).tolist())

        return jsonify({
            "labels": labels.tolist(),
            "n_clusters": n_clusters,
            "n_noise": n_noise,
            "silhouette": score,
            "cluster_counts": cluster_counts,
            "core_indices": model.core_sample_indices_.tolist(),
            "pseudo_centroids": pseudo_centroids,
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@dbscan_bp.route("/dbscan/suggest-eps", methods=["POST"])
def suggest_eps():
    body = request.get_json(silent=True) or {}
    data = body.get("data")
    min_samples = int(body.get("min_samples", 5))
    if not data:
        return jsonify({"error": "No data"}), 400

    X = np.array(data)
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    try:
        from sklearn.neighbors import NearestNeighbors
        k = max(1, min_samples - 1)
        nbrs = NearestNeighbors(n_neighbors=k).fit(X_scaled)
        distances, _ = nbrs.kneighbors(X_scaled)
        k_distances = np.sort(distances[:, -1])[::-1].tolist()
        suggested_eps = float(np.percentile(distances[:, -1], 90))
        return jsonify({
            "k_distances": k_distances,
            "suggested_eps": round(suggested_eps, 3)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =====================================================================
# ENDPOINT MỚI: /dbscan/outlier-analysis
# Input:  { data: [[income, spending], ...], labels: [...], col_names: [...] }
# Output: thống kê + insight từng outlier + lý do bất thường
# =====================================================================
@dbscan_bp.route("/dbscan/outlier-analysis", methods=["POST"])
def outlier_analysis():
    body = request.get_json(silent=True) or {}
    data = body.get("data")
    labels = body.get("labels")
    col_names = body.get("col_names", ["income", "spending"])

    if not data or not labels:
        return jsonify({"error": "Thiếu data hoặc labels"}), 400

    X = np.array(data, dtype=float)
    labels_arr = np.array(labels)

    if X.shape[0] != len(labels_arr):
        return jsonify({"error": "data và labels không khớp độ dài"}), 400

    n_total = len(labels_arr)
    noise_mask = labels_arr == -1
    n_noise = int(noise_mask.sum())
    noise_pct = round(n_noise / n_total * 100, 1) if n_total > 0 else 0

    normal_mask = ~noise_mask
    # Nếu tất cả đều là noise, dùng toàn bộ data làm tham chiếu
    if normal_mask.sum() == 0:
        X_normal = X
        summary_insights = [
            f"Tất cả {n_total} điểm đều là noise với tham số hiện tại.",
            "Thử tăng eps (ví dụ: 1.0 → 2.0) hoặc giảm min_samples để tạo được cluster."
        ]
        return jsonify({
            "n_total": n_total,
            "n_noise": n_noise,
            "noise_pct": noise_pct,
            "n_clusters": 0,
            "col_means": {col_names[i]: round(float(X.mean(axis=0)[i]), 2) for i in range(len(col_names))},
            "col_stds":  {col_names[i]: round(float(X.std(axis=0)[i]), 2)  for i in range(len(col_names))},
            "outlier_details": [],
            "summary_insights": summary_insights,
        })

    X_normal = X[normal_mask]
    means = X_normal.mean(axis=0)
    stds = X_normal.std(axis=0)

    # --- Tạo insight từng outlier ---
    outlier_indices = np.where(noise_mask)[0]
    outlier_details = []

    for idx in outlier_indices:
        pt = X[idx]
        reasons = []
        severity_score = 0.0

        for col_i, col_name in enumerate(col_names):
            val = float(pt[col_i])
            mean_val = float(means[col_i])
            std_val = float(stds[col_i]) if stds[col_i] > 0 else 1.0
            z = (val - mean_val) / std_val

            if abs(z) >= 2.5:
                direction = "cao bất thường" if z > 0 else "thấp bất thường"
                reasons.append(f"{col_name} {direction} ({val:.1f} vs TB {mean_val:.1f})")
                severity_score += abs(z)
            elif abs(z) >= 1.5:
                direction = "khá cao" if z > 0 else "khá thấp"
                reasons.append(f"{col_name} {direction} ({val:.1f})")
                severity_score += abs(z) * 0.5

        if not reasons:
            reasons.append("Nằm trong vùng thưa — không đủ điểm lân cận")

        if severity_score >= 5:
            severity = "critical"
            severity_label = "Cực kỳ bất thường"
        elif severity_score >= 3:
            severity = "high"
            severity_label = "Bất thường cao"
        elif severity_score >= 1.5:
            severity = "medium"
            severity_label = "Hơi bất thường"
        else:
            severity = "low"
            severity_label = "Vùng thưa"

        outlier_details.append({
            "index": int(idx),
            "values": {col_names[i]: round(float(pt[i]), 2) for i in range(len(col_names))},
            "reasons": reasons,
            "severity": severity,
            "severity_label": severity_label,
            "severity_score": round(severity_score, 2),
        })

    outlier_details.sort(key=lambda x: x["severity_score"], reverse=True)

    # --- Insight tổng hợp ---
    high_income_noise = 0
    high_spending_noise = 0
    low_both_noise = 0

    for idx in outlier_indices:
        pt = X[idx]
        income_z = (pt[0] - means[0]) / (stds[0] if stds[0] > 0 else 1)
        spending_z = (pt[1] - means[1]) / (stds[1] if stds[1] > 0 else 1)
        if income_z > 1.5:
            high_income_noise += 1
        if spending_z > 1.5:
            high_spending_noise += 1
        if income_z < -1.2 and spending_z < -1.2:
            low_both_noise += 1

    summary_insights = []
    if n_noise == 0:
        summary_insights.append("Không phát hiện outlier — dữ liệu phân bố đều.")
    else:
        summary_insights.append(f"Phát hiện {n_noise} khách bất thường ({noise_pct}% tổng số).")
        if high_spending_noise > 0:
            summary_insights.append(
                f"{high_spending_noise} khách chi tiêu cao bất thường — tiềm năng VIP chưa được phân loại.")
        if high_income_noise > 0:
            summary_insights.append(
                f"{high_income_noise} khách thu nhập cao nhưng hành vi không theo nhóm — có thể là khách doanh nghiệp.")
        if low_both_noise > 0:
            summary_insights.append(
                f"{low_both_noise} khách thu nhập và chi tiêu đều thấp — kiểm tra lại dữ liệu nhập.")
        if n_noise > n_total * 0.2:
            summary_insights.append(
                "Tỉ lệ noise > 20% — thử tăng eps hoặc giảm min_samples.")

    n_clusters_found = int(labels_arr[normal_mask].max() + 1) if normal_mask.sum() > 0 else 0

    return jsonify({
        "n_total": n_total,
        "n_noise": n_noise,
        "noise_pct": noise_pct,
        "n_clusters": n_clusters_found,
        "col_means": {col_names[i]: round(float(means[i]), 2) for i in range(len(col_names))},
        "col_stds": {col_names[i]: round(float(stds[i]), 2) for i in range(len(col_names))},
        "outlier_details": outlier_details,
        "summary_insights": summary_insights,
    })


@dbscan_bp.route("/")
def index():
    return jsonify({"status": "Smart Data Explorer API (DBSCAN) running"})
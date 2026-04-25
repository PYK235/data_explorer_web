from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np

from sklearn.preprocessing import StandardScaler
from sklearn.cluster import DBSCAN, KMeans
from sklearn.metrics import silhouette_score

app = Flask(__name__)
CORS(app)


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


@app.route("/upload", methods=["POST"])
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


@app.route("/kmeans", methods=["POST"])
def kmeans():
    body = request.get_json(silent=True) or {}
    data = body.get("data")
    k = int(body.get("k", 3))
    if not data:
        return jsonify({"error": "No data"}), 400

    X = np.array(data)
    if X.ndim != 2 or X.shape[0] < 2:
        return jsonify({"error": "Data không hợp lệ"}), 400

    # Scale
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    k = max(2, min(k, X.shape[0]))
    try:
        model = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = model.fit_predict(X_scaled)
        centroids_scaled = model.cluster_centers_
        # Inverse transform centroids về không gian gốc để vẽ đúng
        centroids = scaler.inverse_transform(centroids_scaled)

        try:
            score = float(silhouette_score(X_scaled, labels))
        except Exception:
            score = 0.0

        unique, counts = np.unique(labels, return_counts=True)
        cluster_counts = dict(zip(unique.astype(int).tolist(), counts.astype(int).tolist()))

        return jsonify({
            "labels": labels.tolist(),
            "centroids": centroids.tolist(),
            "silhouette": score,
            "n_clusters": int(k),
            "cluster_counts": cluster_counts
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/elbow", methods=["POST"])
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


@app.route("/dbscan", methods=["POST"])
def dbscan():
    body = request.get_json(silent=True) or {}
    data = body.get("data")
    eps = float(body.get("eps", 0.5))
    min_samples = int(body.get("min_samples", 5))

    print(f"👉 DBSCAN — eps: {eps}, min_samples: {min_samples}")

    if not data:
        return jsonify({"error": "No data"}), 400

    X = np.array(data)
    if X.ndim != 2 or X.shape[0] < 2:
        return jsonify({"error": "Data không hợp lệ"}), 400

    # Scale data trước khi chạy DBSCAN
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # eps nhận từ frontend là "scaled units" (0.1 - 3.0)
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

        # Pseudo centroids trong không gian gốc (để vẽ đúng tọa độ)
        pseudo_centroids = []
        for lbl in sorted(unique_labels - {-1}):
            pts = X[labels == lbl]
            pseudo_centroids.append(pts.mean(axis=0).tolist())

        print(f"✅ n_clusters={n_clusters}, n_noise={n_noise}, silhouette={score:.3f}")

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


@app.route("/dbscan/suggest-eps", methods=["POST"])
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


@app.route("/")
def index():
    return jsonify({"status": "Smart Data Explorer API (DBSCAN) running"})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
from flask import Blueprint, request, jsonify
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score, davies_bouldin_score
from scipy.cluster.hierarchy import dendrogram, fcluster, linkage as scipy_linkage
import numpy as np

try:
    from fastcluster import linkage_vector as fast_linkage_vector
except ImportError:
    fast_linkage_vector = None


hierarchical_bp = Blueprint("hierarchical_bp", __name__)
SUPPORTED_METHODS = {"single", "centroid", "median", "ward"}


def _build_linkage(X_scaled, method, metric):
    if fast_linkage_vector is not None:
        return fast_linkage_vector(X_scaled, method=method, metric=metric), "fastcluster"

    return scipy_linkage(X_scaled, method=method, metric=metric), "scipy"


@hierarchical_bp.route("/hierarchical", methods=["POST"])
def run_hierarchical():
    body = request.get_json(silent=True) or {}
    data = body.get("data")
    if not data:
        return jsonify({"error": "Empty data"}), 400

    linkage_method = str(body.get("linkage", "ward")).lower()
    metric = str(body.get("metric", "euclidean")).lower()
    cut_percent = float(body.get("cut_percent", 65))

    if linkage_method not in SUPPORTED_METHODS:
        return jsonify({"error": "Linkage khong ho tro"}), 400

    if linkage_method in {"ward", "centroid", "median"} and metric != "euclidean":
        return jsonify({"error": "Ward, centroid, median bat buoc dung metric euclidean"}), 400

    X = np.array(data, dtype=float)
    if X.ndim != 2 or X.shape[0] < 2:
        return jsonify({"error": "Data khong hop le"}), 400

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    Z, engine = _build_linkage(X_scaled, linkage_method, metric)
    distances = Z[:, 2] if Z.shape[1] >= 3 else None
    if distances is None or len(distances) == 0:
        return jsonify({"error": "Khong the tao cay phan cap"}), 400

    min_distance = float(np.min(distances))
    max_distance = float(np.max(distances))
    normalized_cut = min(max(cut_percent, 0.0), 100.0) / 100.0
    cut_threshold = min_distance + (max_distance - min_distance) * normalized_cut

    labels = fcluster(Z, t=cut_threshold, criterion="distance") - 1
    n_clusters = int(len(np.unique(labels)))

    if 1 < n_clusters < len(X_scaled):
        score = silhouette_score(X_scaled, labels)
        davies = davies_bouldin_score(X_scaled, labels)
    else:
        score = -1
        davies = -1

    pca = PCA(n_components=2)
    points = pca.fit_transform(X_scaled)
    dendro = dendrogram(Z, no_plot=True, color_threshold=cut_threshold)

    return jsonify({
        "labels": labels.tolist(),
        "n_clusters": n_clusters,
        "linkage": linkage_method,
        "metric": metric,
        "engine": engine,
        "cut_percent": cut_percent,
        "cut_threshold": float(cut_threshold),
        "distance_range": [min_distance, max_distance],
        "z_matrix": np.round(Z, 6).tolist(),
        "dendrogram": {
            "icoord": dendro["icoord"],
            "dcoord": dendro["dcoord"],
            "ivl": dendro["ivl"],
            "leaves": dendro["leaves"],
            "color_list": dendro["color_list"],
        },
        "silhouette": float(score),
        "davies_bouldin": float(davies),
        "points": points.tolist()
    })

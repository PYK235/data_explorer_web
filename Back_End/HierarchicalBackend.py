from flask import Blueprint, request, jsonify
from sklearn.cluster import AgglomerativeClustering
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
from sklearn.metrics import silhouette_score, davies_bouldin_score
import numpy as np

hierarchical_bp = Blueprint("hierarchical_bp", __name__)

@hierarchical_bp.route("/hierarchical", methods=["POST"])
def run_hierarchical():
    data = request.json.get("data")
    if not data:
        return jsonify({"error": "Empty data"}), 400
    n_clusters = request.json.get("n_clusters", 3)
    linkage = request.json.get("linkage", "ward")

    X = np.array(data, dtype=float)

    # chuẩn hóa
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # clustering
    model = AgglomerativeClustering(
        n_clusters=n_clusters,
        linkage=linkage
)
    labels = model.fit_predict(X_scaled)

    # score
    if len(set(labels)) > 1:
        score = silhouette_score(X_scaled, labels)
        davies = davies_bouldin_score(X_scaled, labels)
    else:
        score = -1
        davies = -1

    # giảm chiều để vẽ
    pca = PCA(n_components=2)
    points = pca.fit_transform(X_scaled)

    return jsonify({
        "labels": labels.tolist(),
        "silhouette": float(score),
        "davies_bouldin": float(davies),  # 👈 THÊM
        "points": points.tolist()
    })

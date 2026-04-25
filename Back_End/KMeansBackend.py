from flask import Flask, request, jsonify
from flask import Blueprint
from flask_cors import CORS
import pandas as pd
import numpy as np

from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

kmeans_bp = Blueprint("kmeans_bp", __name__)
# =========================
# Utils
# =========================
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

    # loại NaN đơn giản
    X = X.dropna()

    if X.shape[0] < 2:
        raise ValueError("Không đủ dữ liệu sau khi loại NaN")

    return X


def _scale(X):
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    return X_scaled


# =========================
# Upload + xử lý
# =========================
@kmeans_bp.route("/upload", methods=["POST"])
def upload():
    file = request.files.get("file")

    if not file:
        return jsonify({"error": "No file uploaded"}), 400

    try:
        df = _read_file(file)
        X = _select_numeric(df)
        X_scaled = _scale(X)

        return jsonify({
            "data": X_scaled.tolist(),
            "columns": X.columns.tolist(),
            "n_rows": int(X.shape[0]),
            "n_cols": int(X.shape[1])
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


# =========================
# KMeans
# =========================
@kmeans_bp.route("/kmeans", methods=["POST"])
def kmeans():
    body = request.get_json(silent=True) or {}

    data = body.get("data")
    k = int(body.get("k", 3))

    print("👉 K nhận được:", k)

    if not data:
        return jsonify({"error": "No data"}), 400

    X = np.array(data)

    if X.ndim != 2 or X.shape[0] < 2:
        return jsonify({"error": "Data không hợp lệ"}), 400

    # ===== fix k =====
    if k < 2:
        k = 2
    if k > X.shape[0]:
        k = X.shape[0]

    try:
        model = KMeans(n_clusters=k, random_state=42, n_init=10)
        labels = model.fit_predict(X)
        centroids = model.cluster_centers_

        # ===== silhouette =====
        try:
            score = float(silhouette_score(X, labels))
        except Exception:
            score = 0.0

        # ===== cluster counts =====
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


# =========================
# Elbow Method
# =========================
@kmeans_bp.route("/elbow", methods=["POST"])
def elbow():
    body = request.get_json(silent=True) or {}
    data = body.get("data")

    if not data:
        return jsonify({"error": "No data"}), 400

    X = np.array(data)

    if X.ndim != 2 or X.shape[0] < 2:
        return jsonify({"error": "Data không hợp lệ"}), 400

    try:
        max_k = min(10, X.shape[0])
        Ks = list(range(1, max_k + 1))
        inertia = []

        for k in Ks:
            model = KMeans(n_clusters=k, random_state=42, n_init=10)
            model.fit(X)
            inertia.append(float(model.inertia_))

        return jsonify({
            "k": Ks,
            "inertia": inertia
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================
# Health check (debug nhanh)
# =========================
@kmeans_bp.route("/")
def index():
    return jsonify({"status": "Smart Data Explorer API running"})


from flask import Blueprint, request, jsonify
import pandas as pd
import numpy as np
import os
import joblib

from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import (
    silhouette_score,
    davies_bouldin_score
)

kmeans_bp = Blueprint("kmeans_bp", __name__)

# =========================================================
# PATHS
# =========================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH = os.path.join(BASE_DIR, "kmeans_model.pkl")
SCALER_PATH = os.path.join(BASE_DIR, "kmeans_scaler.pkl")
GROUPS_PATH = os.path.join(BASE_DIR, "cluster_groups.pkl")

# =========================================================
# GLOBAL VARIABLES
# =========================================================
trained_model = None
trained_scaler = None
cluster_groups = {}

# =========================================================
# AUTO LOAD MODEL
# =========================================================
def load_saved_model():

    global trained_model
    global trained_scaler
    global cluster_groups

    try:

        loaded = False

        if os.path.exists(MODEL_PATH):
            trained_model = joblib.load(MODEL_PATH)
            loaded = True

        if os.path.exists(SCALER_PATH):
            trained_scaler = joblib.load(SCALER_PATH)
            loaded = True

        if os.path.exists(GROUPS_PATH):
            cluster_groups = joblib.load(GROUPS_PATH)
            loaded = True

        if loaded:
            print(" Saved KMeans model loaded")
        else:
            print(" No saved model found")

    except Exception as e:

        print(
            "    Failed loading saved model:",
            e
        )


load_saved_model()

# =========================================================
# HELPERS
# =========================================================
def build_cluster_profiles(
    centroids
):

    profiles = {}

    income_values = [
        center[0]
        for center in centroids
    ]

    spending_values = [
        center[1]
        for center in centroids
    ]

    avg_income = np.mean(
        income_values
    )

    avg_spending = np.mean(
        spending_values
    )

    for i, center in enumerate(
        centroids
    ):

        income = float(center[0])

        spending = float(center[1])

        if (
            income >= avg_income
            and
            spending >= avg_spending
        ):

            name = "VIP"

        elif (
            income >= avg_income
            and
            spending < avg_spending
        ):

            name = "Tiềm năng"

        elif (
            income < avg_income
            and
            spending < avg_spending
        ):

            name = "Tiết kiệm"

        else:

            name = "Bình thường"

        profiles[str(i)] = name

    return profiles


def normalize_input_data(data):

    """
    Support:

    [
      {"income": 10, "spending": 20}
    ]

    OR

    [
      [10,20]
    ]
    """

    if not data:
        raise ValueError("Empty data")

    normalized = []

    for row in data:

        # =================================
        # OBJECT
        # =================================
        if isinstance(row, dict):

            numeric_values = []

            priority_keys = [
                "income",
                "spending",
                "annual income",
                "spending score"
            ]

            # ưu tiên lấy income/spending
            for target_key in priority_keys:

                for real_key in row.keys():

                    if target_key.lower() in real_key.lower():

                        try:
                            numeric_values.append(
                                float(row[real_key])
                            )
                        except:
                            pass

            # fallback
            if len(numeric_values) < 2:

                numeric_values = []

                for value in row.values():

                    try:
                        numeric_values.append(float(value))
                    except:
                        pass

            if len(numeric_values) < 2:
                raise ValueError(
                    "Dataset cần ít nhất 2 cột số"
                )

            normalized.append(
                numeric_values[:2]
            )

        # =================================
        # ARRAY
        # =================================
        elif isinstance(row, list):

            if len(row) < 2:
                raise ValueError(
                    "Mỗi row cần ít nhất 2 giá trị"
                )

            normalized.append([
                float(row[0]),
                float(row[1])
            ])

        else:
            raise ValueError("Data format invalid")

    X = np.array(normalized, dtype=float)

    if X.ndim != 2:
        raise ValueError("Data invalid")

    if len(X) < 2:
        raise ValueError("Need at least 2 rows")

    return X


def build_cluster_counts(labels):

    unique, counts = np.unique(
        labels,
        return_counts=True
    )

    return {
        int(k): int(v)
        for k, v in zip(unique, counts)
    }


# =========================================================
# AUTO TRAIN MODEL
# =========================================================
def auto_train_predict_model(
    X_scaled,
    labels,
    scaler,
    centroids
):

    global trained_model
    global trained_scaler
    global cluster_groups

    clf = DecisionTreeClassifier(
        random_state=42
    )

    clf.fit(X_scaled, labels)

    groups = {}

    dynamic_groups = build_cluster_profiles(centroids)

    for i in range(len(centroids)):

        groups[int(i)] = dynamic_groups[str(i)]

    trained_model = clf
    trained_scaler = scaler
    cluster_groups = groups

    
    if not os.path.exists(MODEL_PATH):

        joblib.dump(clf, MODEL_PATH)

    if not os.path.exists(SCALER_PATH):

        joblib.dump(scaler, SCALER_PATH)

    if not os.path.exists(GROUPS_PATH):

        joblib.dump(groups, GROUPS_PATH)

    print("✅ Predict model auto-trained")


# =========================================================
# UPLOAD
# =========================================================
@kmeans_bp.route("/upload", methods=["POST"])
def upload():

    file = request.files.get("file")

    if not file:
        return jsonify({
            "error": "No file uploaded"
        }), 400

    try:

        filename = (
            file.filename or ""
        ).lower()

        if filename.endswith(".csv"):
            df = pd.read_csv(file)

        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file)

        else:
            return jsonify({
                "error": "Unsupported file format"
            }), 400

        numeric_df = df.select_dtypes(
            include=[np.number]
        )

        numeric_df = numeric_df.dropna()

        if numeric_df.shape[1] < 2:
            return jsonify({
                "error": "Need at least 2 numeric columns"
            }), 400

        return jsonify({
            "data": numeric_df.values.tolist(),
            "columns": numeric_df.columns.tolist(),
            "n_rows": int(numeric_df.shape[0]),
            "n_cols": int(numeric_df.shape[1])
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# KMEANS
# =========================================================
@kmeans_bp.route("/kmeans", methods=["POST"])
def run_kmeans():

    print("🔥 /kmeans called")

    body = request.get_json(
        silent=True
    ) or {}

    raw_data = body.get("data")

    k = int(body.get("k", 4))

    if raw_data is None:
        return jsonify({
            "error": "No data"
        }), 400

    try:

        # =================================
        # NORMALIZE
        # =================================
        X = normalize_input_data(
            raw_data
        )

        # =================================
        # FIX K
        # =================================
        k = max(2, min(k, len(X)))

        # =================================
        # SCALE
        # =================================
        scaler = StandardScaler()

        X_scaled = scaler.fit_transform(X)

        # =================================
        # MODEL
        # =================================
        model = KMeans(
            n_clusters=k,
            random_state=42,
            n_init=10
        )

        labels = model.fit_predict(
            X_scaled
        )

        # =================================
        # CENTROIDS
        # =================================
        centroids_scaled = (
            model.cluster_centers_
        )

        centroids = scaler.inverse_transform(
            centroids_scaled
        )

        # =================================
        # METRICS
        # =================================
        try:

            silhouette = float(
                silhouette_score(
                    X_scaled,
                    labels
                )
            )

        except:
            silhouette = 0.0

        try:

            davies = float(
                davies_bouldin_score(
                    X_scaled,
                    labels
                )
            )

        except:
            davies = 0.0

        # =================================
        # COUNTS + NAMES
        # =================================
        cluster_counts = build_cluster_counts(
            labels
        )

        cluster_names = build_cluster_profiles(
            centroids
        )

        # =================================
        # AUTO TRAIN PREDICT MODEL
        # =================================
        try:

            auto_train_predict_model(
                X_scaled,
                labels,
                scaler,
                centroids
            )

        except Exception as train_error:

            print(
                "❌ Auto train failed:",
                train_error
            )

        # =================================
        # RESPONSE
        # =================================
        return jsonify({

            "labels": labels.tolist(),

            "centroids": np.round(
                centroids,
                3
            ).tolist(),

            "silhouette": round(
                silhouette,
                4
            ),

            "davies_bouldin": round(
                davies,
                4
            ),

            "n_clusters": int(k),

            "cluster_counts": cluster_counts,

            "cluster_names": cluster_names
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# PREDICT
# =========================================================
@kmeans_bp.route("/predict", methods=["POST"])
def predict():

    global trained_model
    global trained_scaler
    global cluster_groups

    if trained_model is None:

        return jsonify({
            "error": "Model not trained"
        }), 400

    body = request.get_json(
        silent=True
    ) or {}

    try:

        income = float(
            body.get("income")
        )

        spending = float(
            body.get("spending")
        )

        X = np.array([
            [income, spending]
        ])

        X_scaled = trained_scaler.transform(
            X
        )

        prediction = int(
            trained_model.predict(
                X_scaled
            )[0]
        )

        cluster_name = cluster_groups.get(
            prediction,
            "Unknown"
        )

        return jsonify({

            "clusterLabel": prediction,

            "clusterName": cluster_name,

            "income": income,

            "spending": spending
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500


# =========================================================
# ELBOW METHOD
# =========================================================
@kmeans_bp.route("/elbow", methods=["POST"])
def elbow():

    body = request.get_json(
        silent=True
    ) or {}

    raw_data = body.get("data")

    if raw_data is None:

        return jsonify({
            "error": "No data"
        }), 400

    try:

        X = normalize_input_data(
            raw_data
        )

        scaler = StandardScaler()

        X_scaled = scaler.fit_transform(
            X
        )

        max_k = min(10, len(X))

        ks = []
        inertia = []

        for k in range(1, max_k + 1):

            model = KMeans(
                n_clusters=k,
                random_state=42,
                n_init=10
            )

            model.fit(X_scaled)

            ks.append(k)

            inertia.append(
                float(model.inertia_)
            )

        return jsonify({
            "k": ks,
            "inertia": inertia
        })

    except Exception as e:

        return jsonify({
            "error": str(e)
        }), 500




# =========================================================
# HEALTH CHECK
# =========================================================
@kmeans_bp.route("/")
def home():

    return jsonify({
        "status": "KMeans API running"
    })


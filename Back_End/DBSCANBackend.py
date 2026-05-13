@dbscan_bp.route("/kmeans", methods=["POST"])
def kmeans():
    body=request.get_json(silent=True) or {}
    data=body.get("data")
    k=int(body.get("k",3))

    if not data:
        return jsonify({"error":"No data"}),400

    df=pd.DataFrame(data)

    X=df[[
        "income",
        "spending"
    ]].values

    if X.ndim!=2 or X.shape[0]<2:
        return jsonify({"error":"Data không hợp lệ"}),400

    scaler=StandardScaler()
    X_scaled=scaler.fit_transform(X)

    k=max(2,min(k,X.shape[0]))

    try:
        model=KMeans(
            n_clusters=k,
            random_state=42,
            n_init=10
        )

        labels=model.fit_predict(X_scaled)

        centroids_scaled=model.cluster_centers_

        centroids=scaler.inverse_transform(
            centroids_scaled
        )

        try:
            score=float(
                silhouette_score(
                    X_scaled,
                    labels
                )
            )

        except Exception:
            score=0.0

        unique,counts=np.unique(
            labels,
            return_counts=True
        )

        cluster_counts=dict(
            zip(
                unique.astype(int).tolist(),
                counts.astype(int).tolist()
            )
        )

        return jsonify({
            "labels":labels.tolist(),
            "centroids":centroids.tolist(),
            "silhouette":score,
            "n_clusters":int(k),
            "cluster_counts":cluster_counts
        })

    except Exception as e:
        return jsonify({
            "error":str(e)
        }),500


@dbscan_bp.route("/dbscan", methods=["POST"])
def dbscan():
    body=request.get_json(silent=True) or {}

    data=body.get("data")

    eps=float(
        body.get("eps",0.5)
    )

    min_samples=int(
        body.get("min_samples",5)
    )

    print(
        f"DBSCAN eps={eps}, "
        f"min_samples={min_samples}"
    )

    if data is None or len(data)==0:
        return jsonify({
            "error":"No data"
        }),400

    df=pd.DataFrame(data)

    X=df[[
        "income",
        "spending"
    ]].values

    if X.ndim!=2 or X.shape[0]<2:
        return jsonify({
            "error":"Data không hợp lệ"
        }),400

    scaler=StandardScaler()

    X_scaled=scaler.fit_transform(X)

    eps=max(
        0.01,
        min(eps,10.0)
    )

    min_samples=max(
        2,
        min(
            min_samples,
            X.shape[0]//2
        )
    )

    try:
        model=DBSCAN(
            eps=eps,
            min_samples=min_samples
        )

        labels=model.fit_predict(
            X_scaled
        )

        unique_labels=set(labels)

        n_clusters=len(
            unique_labels-{-1}
        )

        n_noise=int(
            np.sum(labels==-1)
        )

        try:
            if(
                n_clusters>=2 and
                n_noise<len(labels)
            ):

                mask=labels!=-1

                score=float(
                    silhouette_score(
                        X_scaled[mask],
                        labels[mask]
                    )
                )

            else:
                score=0.0

        except Exception:
            score=0.0

        unique,counts=np.unique(
            labels,
            return_counts=True
        )

        cluster_counts=dict(
            zip(
                unique.astype(int).tolist(),
                counts.astype(int).tolist()
            )
        )

        pseudo_centroids=[]

        for lbl in sorted(
            unique_labels-{-1}
        ):

            pts=X[labels==lbl]

            pseudo_centroids.append(
                pts.mean(axis=0).tolist()
            )

        return jsonify({
            "labels":labels.tolist(),
            "n_clusters":n_clusters,
            "n_noise":n_noise,
            "silhouette":score,
            "cluster_counts":cluster_counts,
            "core_indices":
                model.core_sample_indices_.tolist(),
            "pseudo_centroids":
                pseudo_centroids
        })

    except Exception as e:
        return jsonify({
            "error":str(e)
        }),500


@dbscan_bp.route("/dbscan/suggest-eps", methods=["POST"])
def suggest_eps():
    body=request.get_json(silent=True) or {}

    data=body.get("data")

    min_samples=int(
        body.get("min_samples",5)
    )

    if data is None or len(data)==0:
        return jsonify({
            "error":"No data"
        }),400

    df=pd.DataFrame(data)

    X=df[[
        "income",
        "spending"
    ]].values

    scaler=StandardScaler()

    X_scaled=scaler.fit_transform(X)

    try:
        from sklearn.neighbors import NearestNeighbors

        k=max(
            1,
            min_samples-1
        )

        nbrs=NearestNeighbors(
            n_neighbors=k
        ).fit(X_scaled)

        distances,_=nbrs.kneighbors(
            X_scaled
        )

        k_distances=np.sort(
            distances[:,-1]
        )[::-1].tolist()

        suggested_eps=float(
            np.percentile(
                distances[:,-1],
                90
            )
        )

        return jsonify({
            "k_distances":k_distances,
            "suggested_eps":round(
                suggested_eps,
                3
            )
        })

    except Exception as e:
        return jsonify({
            "error":str(e)
        }),500
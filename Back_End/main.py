from flask import Flask
from flask_cors import CORS

from KMeansBackend import kmeans_bp
from HierarchicalBackend import hierarchical_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(kmeans_bp)
app.register_blueprint(hierarchical_bp)

@app.route("/")
def home():
    return {"status": "Main API Running"}

if __name__ == "__main__":
    app.run(debug=True, port=5000)